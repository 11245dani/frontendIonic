import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonAvatar,
  IonLabel,
  IonItem,
  IonMenu,
  IonMenuButton,
  IonToolbar,
  IonButtons
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AlertController } from '@ionic/angular';
import { SideMenuComponent } from '../components/side-menu/side-menu.component'; // ajusta la ruta


@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonAvatar,
    IonLabel,
    IonItem,
    SideMenuComponent,
    IonMenu,
    IonMenuButton,
    IonToolbar,
    IonButtons
  ]
})
export class Tab3Page implements OnInit {
  user: any = null;
  token: string = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.token = localStorage.getItem('token') || '';
    if (this.token) {
      this.loadUserData();
    }
  }

  loadUserData(): void {
    this.userService.getUser(this.token).subscribe({
      next: (response: any) => {
        this.user = response;
      },
      error: (error: any) => {
        console.error('Error al obtener usuario:', error);
        this.showAlert('Error', 'No se pudo cargar la información del usuario.');
      }
    });
  }

  async uploadPhoto(): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt
      });

      if (!image.base64String) throw new Error('No se obtuvo la imagen en base64.');

      const base64Image = 'data:image/jpeg;base64,' + image.base64String;

      // ⚠️ Este método debe estar implementado en UserService
      this.userService.updatePhoto(this.token, base64Image).subscribe({
        next: (res: any) => {
          this.user.photo = res.photoUrl;
          this.showAlert('Éxito', 'Foto actualizada correctamente.');
        },
        error: (error: any) => {
          console.error('Error al subir foto:', error);
          this.showAlert('Error', 'No se pudo subir la foto.');
        }
      });
    } catch (error: any) {
      console.error('Error al acceder a la cámara:', error);
      this.showAlert('Error', 'No se pudo acceder a la cámara o galería.');
    }
  }

  async showAlert(header: string, message: string): Promise<void> {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

async logout() {
  const alert = await this.alertController.create({
    header: '¿Cerrar sesión?',
    message: '¿Estás seguro de que deseas cerrar sesión?',
    cssClass: 'custom-logout-alert',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
        cssClass: 'cancel-button'
      },
      {
        text: 'Sí, cerrar sesión',
        handler: () => {
          // ✅ Limpia los datos de sesión
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          this.router.navigateByUrl('/login', { replaceUrl: true });
        },
        cssClass: 'confirm-button'
      }
    ]
  });

  await alert.present();
}

}
