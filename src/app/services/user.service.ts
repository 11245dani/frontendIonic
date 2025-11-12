// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.miurlserve; // ej: http://127.0.0.1:8000/api

  constructor(private http: HttpClient) {}

  getUser(token: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.apiUrl}/user`, { headers });
  }
  /** ✅ Método que el componente Tab3 usa */
  updatePhoto(token: string, base64Image: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = { image: base64Image };

    return this.http.post(`${this.apiUrl}/user/photo`, body, { headers });
  }
}
