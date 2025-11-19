import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Location } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, 
    HttpClientModule,     RouterModule,   // <- necesario para routerLink
],
})
export class LoginPage {
  email = '';
  password = '';
  passwordVisible = false;   // ← NUEVA PROPIEDAD
  isLoading = false;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private location: Location
  ) {}

async login() {
  this.isLoading = true;
  this.errorMessage = '';

  this.http
    .post('http://127.0.0.1:8000/api/login', {
      email: this.email,
      password: this.password,
    })
    .subscribe({
      next: (res: any) => {
        console.log('Respuesta del login:', res);
        this.isLoading = false;

        // Guardar token y usuario
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        // ✅ Verificar rol del usuario
        const roleName = res.user.role?.nombre || res.user.rol?.nombre;

        if (roleName === 'conductor') {
          this.router.navigate(['/tabs/tab1']); // ruta del conductor
        } else if (roleName === 'ciudadano') {
          this.router.navigate(['/ciudadano-home']); // página principal del ciudadano
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al iniciar sesión';
      },
    });
}

togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }


  goBack() {
    this.location.back();
  }
}