import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Preferences } from '@capacitor/preferences';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  getUser(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/user`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private apiUrl = environment.miurlserve;

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap(async (res: any) => {
        if (res.token) {
          await Preferences.set({ key: 'token', value: res.token });
        }
      })
    );
  }

  async getToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: 'token' });
    return value;
  }

  async logout(): Promise<void> {
    const token = await this.getToken();
    if (!token) return;

    this.http.post(`${this.apiUrl}/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe(async () => {
      await Preferences.remove({ key: 'token' });
    });
  }
}
