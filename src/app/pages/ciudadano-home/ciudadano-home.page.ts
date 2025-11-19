import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonApp,
  IonMenu
} from '@ionic/angular/standalone';

import { Router } from '@angular/router';
import { MenuCiudadanoComponent } from 'src/app/components/menu-ciudadano/menu-ciudadano.component';

@Component({
  selector: 'app-ciudadano-home',
  standalone: true,
  templateUrl: './ciudadano-home.page.html',
  styleUrls: ['./ciudadano-home.page.scss'],
  imports: [
    CommonModule,
    IonApp,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    MenuCiudadanoComponent
  ]
})
export class CiudadanoHomePage {

  user: any = null;

  constructor(private router: Router) {
    const userData = localStorage.getItem('user');
    if (userData) this.user = JSON.parse(userData);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  irPerfil() {
    this.router.navigate(['/ciudadano/perfil']);
  }
}
