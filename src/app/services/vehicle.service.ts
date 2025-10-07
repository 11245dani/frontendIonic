// src/app/services/vehicle.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private localApiUrl = environment.miurlserve; // Tu API Laravel
  private externalApiUrl = 'http://apirecoleccion.gonzaloandreslucio.com/api/vehiculos'; // API principal

  constructor(private http: HttpClient) {}

  // 🔹 Opción 1: Obtener vehículo desde tu API local (Laravel)
  getVehiculoLocal(userId: number, token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.localApiUrl}/vehiculos/${userId}`, { headers });
  }

  // 🔹 Opción 2: Obtener vehículo directamente desde API principal (por perfil_id)
  getVehiculoExterno(perfilId: string): Observable<any> {
    return this.http.get(`${this.externalApiUrl}?perfil_id=${perfilId}`);
  }
}


