import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { ConfiguradorComponent } from './configurador/configurador.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './login/login.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
    {
    path: '',
    component: LandingComponent, // La página de inicio que llama al configurador.
    title: 'Solopreneur Ultra | Automatización IA',
  },
  { path: 'login', component: LoginComponent, title: 'Iniciar Sesión' },
  
  {
    path: 'configurador',
    component: ConfiguradorComponent,
    title: 'Configurador de Soluciones'
  },

  {
    path: 'dash',
    component: AdminDashboardComponent,
    title: 'Dashboard'
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
