import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { ConfiguradorComponent } from './configurador/configurador.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
    {
    path: '',
    component: LandingComponent, // La página de inicio que llama al configurador.
    title: 'Solopreneur Ultra | Automatización IA',
  },
{ path: 'login', component: LoginComponent, title: 'Iniciar Sesión' },
  // 2. Ruta de Configuración de la Solución (Macroproceso 1.2)
  {
    path: 'configurador',
    component: ConfiguradorComponent,
    title: 'Configurador de Soluciones'
  },
  {
  path: 'onboarding',
  loadComponent: () => import('./onboarding/onboarding.component').then(m => m.OnboardingComponent),
  title: 'Panel de Activación'
},


  // 5. Ruta comodín para manejar URLs incorrectas
  {
    path: '**',
    redirectTo: ''
  }
];
