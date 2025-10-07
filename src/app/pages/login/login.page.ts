import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule],
})
export class LoginPage {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  async login() {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.post('http://127.0.0.1:8000/api/login', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res: any) => {
        console.log('Respuesta del login:', res);
        this.isLoading = false;
        localStorage.setItem('token', res.token);
        this.router.navigate(['/tabs/tab1']);
        console.log('Navegado a:', this.router.url);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al iniciar sesión';
      }
    });
  }
}
