import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-crear-cuenta',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterModule],
  templateUrl: './crear-cuenta.page.html',
  styleUrls: ['./crear-cuenta.page.scss'],
})
export class CrearCuentaPage implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  private apiUrl = 'http://localhost:8000/api/register';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.registerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirmation: ['', [Validators.required]],
      rol: ['', [Validators.required]],
    });
  }

  ngOnDestroy() {
    // 🧹 Se ejecuta al salir del tab o navegar a otro
    this.clearForm();
  }

  ionViewWillLeave() {
    // 🧹 Por si el ciclo de vida Ionic se activa antes
    this.clearForm();
  }

  clearForm() {
    if (this.registerForm) {
      this.registerForm.reset();
    }
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.showToast('Por favor completa todos los campos correctamente', 'warning');
      return;
    }

    this.loading = true;

    try {
      const res: any = await this.http.post(this.apiUrl, this.registerForm.value).toPromise();

      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.showToast('Cuenta creada con éxito', 'success');

        if (res.user.rol?.nombre === 'conductor') {
          this.router.navigate(['/conductor']);
        } else {
          this.router.navigate(['/ciudadano']);
        }
      } else {
        this.showToast('No se pudo registrar el usuario', 'danger');
      }
    } catch (err: any) {
      console.error(err);
      this.showToast(err.error?.message || 'Error al registrar', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
    });
    toast.present();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
