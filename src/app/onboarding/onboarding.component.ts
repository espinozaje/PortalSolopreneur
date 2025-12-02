import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router'; 
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { ConfigService } from '../config-service.service';
import Swal from 'sweetalert2';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'upload' | 'text' | 'connect';
  completed: boolean;
  requiredModule?: string; // Solo aparece si compró este módulo
  value?: string;
  fileName?: string;
  error?: string;
  isValidating?: boolean;
}


@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css'
})
export class OnboardingComponent implements OnInit, AfterViewInit {

  // Simulamos al cliente (en producción esto vendría de la Base de Datos)
  clientName = 'Cliente';
  clientEmail = '';
  purchasedModules: string[] = [];
  private typingTimer: any;
  deploymentStatus: 'pending' | 'building' | 'active' = 'pending';
  pollingInterval: any;
  finalUrl: string = '';

  isChatOpen = false;
isChatLoading = false;
currentChatMessage = '';
chatMessages: { sender: 'user' | 'bot', text: string }[] = [];
  // Lista Maestra de Tareas (Macro 2.2.1)
  allTasks: Task[] = [
    { 
      id: 'logo', 
      title: 'Subir Logo de la Empresa', 
      description: 'Necesitamos tu logo en alta calidad (PNG) para personalizar el bot.', 
      type: 'upload', 
      completed: false 
    },
    { 
      id: 'welcome_msg', 
      title: 'Definir Mensaje de Bienvenida', 
      description: 'Escribe el primer mensaje que dirá tu Chatbot.', 
      type: 'text', 
      requiredModule: 'Chatbot Clásico', 
      completed: false 
    },
    { 
      id: 'whatsapp_api', 
      title: 'Configurar WhatsApp Business', 
      description: 'Ingresa el número de teléfono verificado para el bot.', 
      type: 'text', 
      requiredModule: 'Pagos por Chat', // Solo si compró esto
      completed: false 
    },
    { 
      id: 'lead_criteria',
      title: 'Criterios de Cliente VIP', 
      description: 'Describe las condiciones para ser VIP (Ej: "Presupuesto mayor a $1000" o "Interés en Implantes").', 
      type: 'text', 
      requiredModule: 'Detector de Clientes VIP', 
      completed: false 
    }
  ];

  visibleTasks: Task[] = [];
  progress = 0;
  private preloadedData: any = null;
  currentClientId: string | null = null;
  constructor(private route: ActivatedRoute, private configService: ConfigService, private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.preloadedData = navigation.extras.state['userData'];
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.currentClientId = params['id'];

      if (this.preloadedData) {
        // CASO A: Venimos del Login (Tenemos datos) -> ¡PERFECTO!
        console.log('✅ Usando datos del Login');
        this.applyClientData(this.preloadedData);
        console.log("Datos del cliente:", this.preloadedData);
      } else {
        // CASO B: El usuario refrescó la página (Se perdieron los datos)
        // Como no queremos usar get-client-data, lo mandamos al login de nuevo
        console.warn('⚠️ No hay datos en memoria. Redirigiendo a Login...');
        this.router.navigate(['/login']); // O la ruta de tu login
      }

      this.loadUserData(this.currentClientId!);
    });
  }

toggleChat() {
  this.isChatOpen = !this.isChatOpen;
  // Scroll al fondo al abrir
  if(this.isChatOpen) setTimeout(() => this.scrollToBottom(), 100);
}

sendMessage() {
  if (!this.currentChatMessage.trim()) return;

  const userMsg = this.currentChatMessage;
  // 1. Agregar mensaje del usuario a la lista visual
  this.chatMessages.push({ sender: 'user', text: userMsg });
  this.currentChatMessage = '';
  this.isChatLoading = true;
  this.scrollToBottom();

  // 2. Enviar a n8n (Necesitas crear este método en tu configService)
  this.configService.executeOperation('chat_support', { 
    message: userMsg, 
    clientId: this.currentClientId 
  }).subscribe({
    next: (res: any) => {
      this.isChatLoading = false;
      
      // 3. Recibir respuesta de la IA
      // Si n8n devuelve "ESCALAR_A_HUMANO", el HTML lo detectará y mostrará el botón
      this.chatMessages.push({ sender: 'bot', text: res.response }); // Asegúrate que n8n devuelva { response: "..." }
      this.scrollToBottom();
    },
    error: () => {
      this.isChatLoading = false;
      this.chatMessages.push({ sender: 'bot', text: 'ESCALAR_A_HUMANO' }); // Fallback por si falla el server
      this.scrollToBottom();
    }
  });
}

// Función que conecta el Nivel 1 con el Nivel 2
escalateToTicket() {
  this.isChatOpen = false; // Cerramos el chat
  this.openTicketModal();  // ¡Abrimos tu modal existente!
}

scrollToBottom() {
  // Pequeño hack para bajar el scroll
  try {
    const container = document.querySelector('#scrollContainer');
    if(container) container.scrollTop = container.scrollHeight;
  } catch(e) { }
}

  loadUserData(id: string) {
    // Usamos el mismo servicio que ya tienes para consultar estado
    this.configService.checkUserStatus(id).subscribe({
      next: (user: any) => {
        // 1. Restaurar Datos del Cliente
        this.clientName = user.nombre;
        this.clientEmail = user.email;
        
        // Restaurar Módulos
        if (user.modulos) {
             this.purchasedModules = Array.isArray(user.modulos) 
                ? user.modulos 
                : user.modulos.split(',').map((m: any) => m.trim());
        }
        
        // Recalcular tareas visibles basadas en los módulos recuperados
        this.filterTasks();

        // 2. Restaurar Estado del Despliegue
        if (user.estado === 'activo') {
          // Si ya terminó, mostramos el final directo
          this.deploymentStatus = 'active';
          this.finalUrl = user.system_url || `http://${user.server_ip}`;
        } else {
          // Si no está activo, verificamos si estábamos construyendo
          // Usamos LocalStorage como "memoria persistente" del navegador
          const isBuilding = localStorage.getItem(`building_${id}`);
          
          if (isBuilding === 'true') {
            this.deploymentStatus = 'building';
            this.startPolling(); // Re-conectamos el monitoreo
          } else {
            this.deploymentStatus = 'pending';
          }
        }
      },
      error: (err) => {
        console.error("Error recuperando usuario", err);
        this.router.navigate(['/login']);
      }
    });
  }
applyClientData(data: any) {
      this.clientName = data.nombre;
      this.clientEmail = data.email;
      // Mapear otros datos si es necesario (company, etc)
      
      if (data.modules) {
          if (Array.isArray(data.modules)) {
              this.purchasedModules = data.modules;
          } else {
              this.purchasedModules = data.modules.split(',').map((m: any) => m.trim());
          }
      } else {
          this.purchasedModules = ['Básico'];
      }
      this.filterTasks();
  }

  ngAfterViewInit() {
    
    setTimeout(() => {
      this.startTour();
    }, 1000);
  }

  filterTasks() {
    // Muestra tareas generales + las específicas de los módulos comprados
    this.visibleTasks = this.allTasks.filter(task => 
      !task.requiredModule || this.purchasedModules.includes(task.requiredModule)
    );
    this.updateProgress();
  }

  // --- TOUR INTERACTIVO (Driver.js) ---
  startTour() {
    const driverObj = driver({
      showProgress: true,
      steps: [
        { element: '#welcome-header', popover: { title: '¡Bienvenido a tu Panel!', description: 'Aquí configurarás tu empleado digital en minutos.' } },
        { element: '#progress-card', popover: { title: 'Tu Progreso', description: 'Esta barra te indicará cuánto falta para el despliegue.' } },
        { element: '#task-container', popover: { title: 'Tus Tareas', description: 'Completa esta lista. El sistema validará tus datos automáticamente.' } }
      ]
    });
    driverObj.drive();
  }

  // --- VALIDACIONES (Macro 2.2.2) ---

 // --- VALIDACIÓN UNIVERSAL (Delega todo a n8n) ---

  validateTask(task: Task, content: File | string) {
    task.isValidating = true;
    task.error = undefined;

    // Llamamos al cerebro central
    this.configService.validateWithN8n(task.id, content, this.currentClientId!).subscribe({
      next: (res) => {
        // ... (Este bloque next déjalo tal cual como lo tienes) ...
        task.isValidating = false;
        if (res.valid) {
          task.completed = true;
          task.error = undefined;
        } else {
          task.completed = false;
          task.error = res.message; 
        }
        this.updateProgress();
      },
      // --- AQUÍ ESTÁ EL CAMBIO ---
      error: (err) => {
        task.isValidating = false;
        console.error("Error capturado:", err); // Para depurar en consola

        // Verificamos si n8n nos mandó un mensaje dentro del error
        if (err.error && err.error.message) {
             task.error = err.error.message;
        } else {
             // Solo si no hay mensaje del backend, mostramos el genérico
             task.error = 'Error de conexión con el validador.';
        }
      }
    });
  }

  // Evento para Archivos (Logo, PDF)
  onFileSelected(event: any, task: Task) {
    const file = event.target.files[0];
    if (file) {
      
      this.validateTask(task, file); 
    }
  }


  editTask(task: Task) {
    task.completed = false;
    task.error = undefined;
  }

 onTextInput(task: Task) {
    if (!task.value) return;

    // PASO CLAVE: Si ya hay un timer corriendo (porque escribiste hace poco), ¡MÁTALO!
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // Iniciamos un nuevo timer. Si vuelves a escribir antes de 800ms, este también morirá.
    this.typingTimer = setTimeout(() => {
        console.log("Enviando a n8n:", task.value); // Para que veas en consola que solo sale 1 vez
        this.validateTask(task, task.value!); 
    }, 800); 
  }

  updateProgress() {
    const completedCount = this.visibleTasks.filter(t => t.completed).length;
    this.progress = Math.round((completedCount / this.visibleTasks.length) * 100);
  }

  isSubmitting = false;
  deploySystem() {
    
    if (this.progress < 100) return;

    this.isSubmitting = true; 

   const payload = {
        client: {
            id: this.currentClientId, 
            name: this.clientName 
        },
        tasks: this.visibleTasks.map(t => ({
            id: t.id,
            value: t.value,
            fileName: t.fileName || null 
        }))
    };


    
    this.configService.deploySystem(payload).subscribe({
        next: (res) => {
            this.deploymentStatus = 'building';
            this.startPolling();
            localStorage.setItem(`building_${this.currentClientId}`, 'true');
            // Opcional: Alerta suave para avisar que inició
            const Toast = Swal.mixin({
              toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
            });
            Toast.fire({ icon: 'info', title: 'Construyendo tu sistema...' });
        },
        error: (err) => {
            this.isSubmitting = false;
            console.error(err);
            Swal.fire({
                title: 'Error en el despliegue',
                text: 'No pudimos contactar con la fábrica de software. Intenta de nuevo.',
                icon: 'error'
            });
        }
    });
  }


  startPolling() {
    this.pollingInterval = setInterval(() => {
      this.configService.checkUserStatus(this.currentClientId!).subscribe(user => {
        
        console.log("Estado actual:", user);

        if (user.estado === 'activo') {
          // ¡YA TERMINÓ!
          clearInterval(this.pollingInterval);
          localStorage.removeItem(`building_${this.currentClientId}`);
          this.deploymentStatus = 'active';
          this.isSubmitting = false;
          
          

          // 3.2.1 - NOTIFICACIÓN FINAL EN EL PORTAL
          Swal.fire({
            title: '¡Completado! 🚀',
            text: 'Tu solución está activa, te enviamos un correo.',
            icon: 'success'
          }).then((result) => {
            if (result.isConfirmed) {
              window.open(this.finalUrl, '_blank');
            }
          });
        }
      });
    }, 5000); // Pregunta cada 5 segundos
  }

  // --- MACROPROCESO 4: FUNCIONES DE OPERACIÓN ---

  // 4.1: Abrir Portal de Facturación (Stripe)
  openBillingPortal() {
    // Validamos que tengamos el email (clave para Stripe)
    if (!this.clientEmail) {
      Swal.fire('Error', 'No se ha cargado el email del cliente.', 'error');
      return;
    }

    Swal.fire({
      title: 'Conectando con Stripe...',
      text: 'Generando sesión segura de facturación',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
        
        // Llamada REAL a n8n
        this.configService.executeOperation('billing_portal', {
          email: this.clientEmail,
          clientId: this.currentClientId
        }).subscribe({
          next: (res: any) => {
            Swal.close();
            if (res.url) {
              // Redirigimos al cliente al portal oficial de Stripe
              window.location.href = res.url;
            } else {
              Swal.fire('Ups', 'No encontramos una suscripción activa asociada a este correo.', 'warning');
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error de Conexión', 'No se pudo conectar con el sistema de pagos.', 'error');
          }
        });
      }
    });
  }

  // 4.2: Crear Ticket de Soporte
  openTicketModal() {
    Swal.fire({
      title: 'Soporte Técnico',
      html: `
        <input id="ticket-subject" class="swal2-input" placeholder="Asunto del problema">
        <textarea id="ticket-desc" class="swal2-textarea" placeholder="Describe detalladamente el error..."></textarea>
      `,
      confirmButtonText: 'Enviar Ticket',
      showCancelButton: true,
      preConfirm: () => {
        const subject = (document.getElementById('ticket-subject') as HTMLInputElement).value;
        const desc = (document.getElementById('ticket-desc') as HTMLTextAreaElement).value;
        
        if (!subject || !desc) {
          Swal.showValidationMessage('Por favor completa ambos campos');
        }
        return { subject, desc };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Enviar a n8n
        this.sendTicketToN8N(result.value);
      }
    });
  }

  sendTicketToN8N(ticketData: any) {
    // Mostramos carga mientras n8n procesa
    Swal.fire({
      title: 'Enviando...',
      didOpen: () => Swal.showLoading()
    });

    this.configService.executeOperation('create_ticket', {
      clientId: this.currentClientId,
      email: this.clientEmail,
      ticket: ticketData
    }).subscribe({
      next: (res: any) => {
        // Éxito: n8n respondió (y la IA ya clasificó el ticket)
        Swal.fire({
          title: '¡Ticket Creado!',
          text: res.message || 'Nuestro equipo de soporte (y la IA) ya están revisando tu caso.',
          icon: 'success',
          confirmButtonColor: '#10B981'
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'Hubo un problema al enviar tu ticket. Intenta más tarde.', 'error');
      }
    });
  }

  // Importante: Limpiar el intervalo si el usuario se va
  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
}
