import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../config-service.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-configurador',
  standalone: true,
  imports: [CommonModule, FormsModule,HttpClientModule, RouterLink],
  templateUrl: './configurador.component.html',
  styleUrl: './configurador.component.css'
})
export class ConfiguradorComponent implements OnInit{
// Variables de estado del componente
  public currentStep = 1;
  public totalDisplay: any; // Total reactivo
  public isSubmitting = false;
  public monthlyPrice = 99;
  // Datos del Step 3 (Bindings del formulario)
  public client = {
    name: '',
    email: '',
    company: '',
    termsChecked: false
  };

  // Definición de Módulos para Step 2
  readonly availableModules = [
    { 
      name: 'Chatbot Clásico', 
      price: 500, 
      color: 'green',
      description: 'Respuestas automáticas 24/7 y captación de leads.'
    },
    { 
      name: 'Pagos por Chat', 
      price: 1500, 
      color: 'blue',
      description: 'Cobra directamente en WhatsApp con enlaces seguros.'
    },
    { 
      name: 'Detector de Clientes VIP',
      price: 3500, 
      color: 'purple',
      description: 'Identifica y etiqueta automáticamente a los clientes de alto valor.'
    }
  ];

  constructor(public configService: ConfigService) {
    this.totalDisplay = this.configService.total;
  } // Inyectamos el servicio

  ngOnInit(): void {
    // Inicialización si es necesario
  }

  // --- LÓGICA DE NAVEGACIÓN ---

  showStep(step: number): void {
    this.currentStep = step;
  }

  // Retorna la fecha de hoy + 30 días
  getNextMonthDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  nextStep(): void {
    // Validaciones del Step 3 (Datos del cliente)
    if (this.currentStep === 3) {
      if (!this.client.name || !this.client.email || !this.client.termsChecked) {
        // @ts-ignore
        Swal.fire('Error', 'Debes completar los datos y aceptar los términos.', 'warning');
        return;
      }
    }
    if (this.currentStep < 4) {
      this.showStep(this.currentStep + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.showStep(this.currentStep - 1);
    }
  }

  // --- LÓGICA DE EVENTOS ---

  onIndustrySelect(name: string, price: number, event: Event): void {
  // 1. Obtenemos el elemento (el div clickeado)
  const element = event.currentTarget as HTMLElement;

  if (!element) {
    // Esto previene que el código se rompa si es nulo (aunque es muy improbable con un click handler)
    return;
  }
  
  // 2. Lógica del servicio
  this.configService.updateIndustry(name, price);

  // 3. Lógica visual del CSS
  document.querySelectorAll('.industry-card').forEach(el => el.classList.remove('selected-card'));
  element.classList.add('selected-card');
}

  onModuleToggle(module: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.configService.toggleModule(module, isChecked);
  }

  async submitFinalOrder(): Promise<void> {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const response = await this.configService.submitOrder(this.client).toPromise();

      // --- CASO A: Venta Directa ---
      if (response.action === 'redirect_payment') {
        // @ts-ignore
        Swal.fire({
          title: 'Procesando...',
          text: 'Redirigiendo a la pasarela de pago.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        // Redirección Real
        setTimeout(() => {
            window.location.href = response.payment_url;
        }, 1500);
      } 
      
      // --- CASO B: Alto Valor (Decisión) ---
      else if (response.action === 'offer_options') {
        // @ts-ignore
        const result = await Swal.fire({
          title: 'Solución Enterprise Detectada',
          text: response.message,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: '💳 Finalizar Compra Ahora',
          cancelButtonText: '📅 Agendar Validación Técnica',
          confirmButtonColor: '#2563EB',
          cancelButtonColor: '#475569',
          reverseButtons: true
        });

        if (result.isConfirmed) {
          // El cliente es valiente y quiere pagar YA.
          // Usamos la URL que n8n nos mandó "por si acaso"
          this.triggerPaymentDirect(response.payment_url);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          // El cliente prefiere la llamada
          this.scheduleCall();
        }
      }

    } catch (error) {
        console.error('Error:', error);
        // @ts-ignore
        Swal.fire('Error', 'No se pudo conectar con el sistema.', 'error');
    } finally {
      this.isSubmitting = false;
    }
  }

  // --- Métodos Auxiliares para la elección ---
  
  triggerPaymentDirect(url: string) {
    // @ts-ignore
    Swal.fire({
        title: 'Excelente decisión',
        text: 'Iniciando pago seguro de alto valor...', 
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
    
    setTimeout(() => {
        // Redirige a la URL que vino de n8n
        window.location.href = url; 
    }, 2000);
  }

  scheduleCall() {
    // Como n8n YA creó la tarea en HubSpot en el paso anterior, 
    // aquí solo confirmamos visualmente al usuario.
    // @ts-ignore
    Swal.fire({
        title: '¡Solicitud Recibida!',
        text: 'Un arquitecto de soluciones te contactará en menos de 24 horas al correo proporcionado.',
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#2563EB'
    });
  }
}
