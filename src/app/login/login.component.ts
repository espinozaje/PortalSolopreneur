import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
credentials = { email: '', password: '' };
  isLoading = false;
  // URL de tu webhook de n8n (Asegúrate de que sea la URL correcta, 
  // si usas el túnel, usa la URL pública, no localhost)
  private webhookUrl = `${environment.apiUrl}/webhook/auth-login`; 

  constructor(private router: Router, private http: HttpClient) {} // Inyectar HttpClient

  login() {
    this.isLoading = true;

    // Realizar la petición POST al webhook de n8n
    this.http.post<any>(this.webhookUrl, this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;

        // Verificar la respuesta del webhook
        // Asumiendo que tu webhook devuelve un JSON con una propiedad "success"
        if (response && response.success) {
          // Guardar información del usuario si es necesario
          // Por ejemplo, el nombre o token que devuelva el webhook
           localStorage.setItem('user', JSON.stringify(response.user)); // Ajusta según la respuesta de tu webhook

          // Redirigir al onboarding
           this.router.navigate(['/onboarding'], {
            queryParams: { id: response.user.id }, // Solo ID en la URL (para que se vea bonito)
    state: { 
      userData: response.user // Pasamos TODO el objeto user por debajo de la mesa
    } // Ajusta según la respuesta de tu webhook
          });
        } else {
          // Manejar caso de credenciales inválidas
          alert(response.message || 'Credenciales incorrectas');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error en el login:', error);
        alert('Ocurrió un error al intentar iniciar sesión. Por favor, inténtalo de nuevo.');
      }
    });
  }
}
