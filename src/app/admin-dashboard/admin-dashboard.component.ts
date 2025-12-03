import { Component } from '@angular/core';
import { ConfigService } from '../config-service.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent {

  isLoading = true;
  data: any = null;


  constructor(private configService: ConfigService) {}

 ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.isLoading = true;
    
    // LLAMADA REAL A N8N
    this.configService.getMissionControlData().subscribe({
      next: (response: any) => {
        console.log('Datos recibidos de Misión de Control:', response);
        this.data = response;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando dashboard:', err);
        this.isLoading = false;
        // Aquí podrías mostrar una alerta de error
      }
    });
  }

  resolveTask(task: any) {
    // Lógica para resolver (ej. ir a Supabase o abrir Stripe)
    window.open(`https://dashboard.stripe.com/search?query=${task.clientName}`, '_blank');
  }


  // ... dentro de la clase OnboardingComponent ...

// Función para el botón "Generar Campaña"
openMarketingModal() {
  Swal.fire({
    title: '📢 Agente de Marketing IA',
    text: '¿Sobre qué tema quieres generar contenido hoy?',
    input: 'text',
    inputPlaceholder: 'Ej: Implantes Dentales sin Dolor',
    showCancelButton: true,
    confirmButtonText: '🚀 Lanzar Campaña',
    confirmButtonColor: '#2563EB',
    showLoaderOnConfirm: true,
    preConfirm: (tema) => {
      if (!tema) {
        Swal.showValidationMessage('Debes escribir un tema');
        return;
      }
      // Llamada al servicio
      // Nota: Convertimos a Promesa para que SweetAlert maneje la carga
      return this.configService.launchMarketingCampaign(tema).toPromise()
        .then(response => {
          return response; // Pasamos la respuesta al siguiente paso
        })
        .catch(error => {
          Swal.showValidationMessage(`Error: ${error.message}`);
        });
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      // ÉXITO: El flujo de n8n terminó (video subido y post creado)
      Swal.fire({
        title: '¡Campaña Publicada! 🎉',
        html: `
          <p>Tu IA ha trabajado por ti:</p>
          <ul style="text-align: left; margin-top: 10px;">
            <li>✅ Video subido a <b>YouTube Shorts</b></li>
            <li>✅ Post publicado en <b>LinkedIn</b></li>
          </ul>
        `,
        icon: 'success'
      });
    }
  });
}
}
