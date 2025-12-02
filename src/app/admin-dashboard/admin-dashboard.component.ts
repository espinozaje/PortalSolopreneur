import { Component } from '@angular/core';
import { ConfigService } from '../config-service.service';
import { CommonModule } from '@angular/common';

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
}
