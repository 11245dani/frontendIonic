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
  IonCardContent
} from '@ionic/angular/standalone';

import { UserService } from '../services/user.service';
import { VehicleService } from '../services/vehicle.service';

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
    IonCardContent
  ]
})
export class Tab3Page implements OnInit {

  user: any;
  vehicle: any;
  token: string = '';

  constructor(
    private userService: UserService,
    private vehicleService: VehicleService
  ) {}

  ngOnInit() {
    // 🔹 Obtén el token guardado en el login
    this.token = localStorage.getItem('token') || '';
    if (this.token) {
      this.loadUserData();
    }
  }

  loadUserData() {
    this.userService.getUser(this.token).subscribe({
      next: (res) => {
        this.user = res;
        console.log('Usuario:', this.user);

        // 🚗 Opción 1: Consultar vehículo local
        this.vehicleService.getVehiculoLocal(this.user.id, this.token).subscribe({
          next: (veh) => {
            console.log('Vehículo recibido desde API local:', veh); // 👈 AQUI
            this.vehicle = veh.vehiculo;
          },
          error: (err) => console.error('Error vehículo local', err)
        });

        // 🚗 Opción 2: Consultar vehículo externo (API principal)
        /*
        this.vehicleService.getVehiculoExterno(this.user.perfil_id).subscribe({
          next: (veh) => {
            console.log('Vehículo recibido desde API externa:', veh); // 👈 Y AQUI SI USAS LA OTRA OPCIÓN
            this.vehicle = veh;
          },
          error: (err) => console.error('Error vehículo externo', err)
        });
        */
      },
      error: (err) => console.error('Error usuario', err)
    });
  }
}
