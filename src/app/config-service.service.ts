// src/app/config.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Definición de Interfaces (Mejora la calidad del código)
interface Module {
  name: string;
  price: number;
}

interface ConfigState {
  industry: string;
  basePrice: number;
  modules: Module[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  
  private readonly WEBHOOK_N8N = `${environment.apiUrl}/webhook/sales-config`;
  private readonly VALIDATOR_WEBHOOK = `${environment.apiUrl}/webhook/validador-maestro`;
  private readonly DEPLOY_WEBHOOK = `${environment.apiUrl}/webhook/deploy-system`;
  private readonly checkStatusUrl = `${environment.apiUrl}/webhook/check-status`;
  private opsUrl = `${environment.apiUrl}/webhook/dashboard-actions`;
  private readonly CHAT_URL = `${environment.apiUrl}/webhook/chat-support`;
  private readonly ADMIN_DASHBOARD_URL = `${environment.apiUrl}/webhook/admin-dashboard`;
  private readonly basePrices: { [key: string]: number } = {
    'Clinica Dental': 1000,
    'E-commerce': 1200,
    'Consultora': 1500,
    'No seleccionado': 0
  };

  // --- Manejo del Estado (Signals) ---
  public industry = signal('No seleccionado');
  public basePrice = signal(0);
  public selectedModules = signal<Module[]>([]);
  public industryPrice = signal<number>(0);
  // Total calculado reactivamente
  public total = computed(() => {
    const moduleCost = this.selectedModules().reduce((sum, mod) => sum + mod.price, 0);
    return this.basePrice() + moduleCost;
  });

  constructor(private http: HttpClient) { }


  validateWithN8n(type: string, content: File | string, clientId?: string): Observable<any> {
    const formData = new FormData();
    formData.append('type', type);
    if (clientId) {
        formData.append('clientId', clientId);
    }
    if (content instanceof File) {
      // Si es archivo (Logo/PDF), lo adjuntamos como binario
      formData.append('file', content);
    } else {
      // Si es texto (API Key/WhatsApp), lo mandamos como texto
      formData.append('content', content);
    }

    return this.http.post<any>(this.VALIDATOR_WEBHOOK, formData);
  }

  getMissionControlData(): Observable<any> {
    return this.http.get(this.ADMIN_DASHBOARD_URL);
  }

  executeOperation(action: string, payload: any): Observable<any> {
    if (action === 'chat_support') {
      return this.http.post(this.CHAT_URL, payload);
    }
    return this.http.post(this.opsUrl, { action, ...payload });
  }


  checkUserStatus(clientId: string): Observable<any> {
    // Hacemos un POST simple a n8n enviando el ID
    return this.http.post(this.checkStatusUrl, { clientId: clientId });
  }

  deploySystem(payload: any): Observable<any> {
    // Enviamos el JSON completo a n8n
    return this.http.post<any>(this.DEPLOY_WEBHOOK, payload);
  }

  // --- Lógica de Negocio ---

  updateIndustry(name: string, price: number): void {
    this.industry.set(name);
    this.basePrice.set(price);
  }

  toggleModule(module: Module, isChecked: boolean): void {
    this.selectedModules.update(modules => {
      if (isChecked) {
        return [...modules, module];
      } else {
        return modules.filter(m => m.name !== module.name);
      }
    });
  }

  // --- Integración con n8n (Envío de Webhook) ---

  submitOrder(clientData: { name: string, email: string, company: string }): Observable<any> {
    
    const payload = {
        nombre: clientData.name,
        apellido: clientData.name.split(' ').slice(1).join(' ') || '', // Simulación de apellido
        email: clientData.email,
        company: clientData.company,
        terms_accepted: true,
        
        // Datos para la cualificación de alto valor (Macro 1.2.2)
        precio_final: this.total(), 
        industria: this.industry(),
        modulos: this.selectedModules().map(m => m.name) 
    };

    // Envío del POST request a n8n para que ejecute la lógica de IF
    return this.http.post<any>(this.WEBHOOK_N8N, payload);
  }
}