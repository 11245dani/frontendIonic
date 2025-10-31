import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonText,
  IonFooter
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonFooter
  ]
})
export class Tab2Page implements OnInit {
  recorridos: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarRecorridos();
  }

  async cargarRecorridos() {
    const token = localStorage.getItem('token');
    const perfil_id = localStorage.getItem('perfil_id');
    const headers = { Authorization: `Bearer ${token}` };

    this.http
      .get(`http://127.0.0.1:8000/api/misrecorridos?perfil_id=${perfil_id}`, { headers })
      .subscribe({
        next: (res: any) => {
          console.log('📦 Mis recorridos:', res);
          this.recorridos = res.recorridos ?? [];
        },
        error: (err) => console.error('❌ Error al cargar recorridos', err),
      });
  }
}
