// src/app/tab3/tab3.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItemDivider
} from '@ionic/angular/standalone';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItemDivider
  ]
})
export class Tab3Page implements OnInit {
  user: any = null;
  token: string = '';

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.token = localStorage.getItem('token') || '';
    if (this.token) {
      this.loadUserData();
    }
  }

  loadUserData() {
    this.userService.getUser(this.token).subscribe({
      next: (res) => {
        console.log('Datos completos del usuario:', res);
        this.user = res;
      },
      error: (err) => {
        console.error('Error al obtener usuario:', err);
      }
    });
  }
}
