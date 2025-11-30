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
    // 3. Iniciamos el Tour (Macro 2.1.2)
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

    console.log("Iniciando despliegue...", payload);

    
    this.configService.deploySystem(payload).subscribe({
        next: (res) => {
            this.isSubmitting = false;
            
            
            Swal.fire({
                title: '¡Construyendo Infraestructura! 🏗️',
                html: `
                    <div class="text-left text-sm">
                        <p>Hemos verificado tu compra en la base de datos.</p>
                        <p>Iniciando despliegue de servidor en AWS...</p>
                        <br>
                        <p>📨 Recibirás las credenciales en tu correo: <b>${this.clientEmail}</b></p>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#2563EB'
            });
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
}
