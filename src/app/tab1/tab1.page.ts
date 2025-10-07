import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButton,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';

import { DataService } from '../services/data.service';
import { CapacitorHttp } from '@capacitor/core';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonButton,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent
  ]
})
export class Tab1Page implements OnInit {
  calles: any[] = [];
  callesPage = 1;
  callesLastPage = 1;
  loadingCalles = false;

  vehiculosExternos: any[] = [];
  loadingVehiculos = false;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadCalles();
    this.loadVehiculosExtern();
  }

  // --- CALLes ---
  async loadCalles(refresh = false) {
    if (refresh) {
      this.callesPage = 1;
      this.calles = [];
    }

    this.loadingCalles = true;
    try {
      const pag = await this.dataService.fetchCalles(this.callesPage);
      const items = pag?.data ?? pag ?? [];
      this.calles = this.callesPage === 1 ? [...items] : [...this.calles, ...items];
      this.callesLastPage = pag?.last_page ?? 1;

      console.log(`✅ Calles cargadas [página ${this.callesPage}] → ${items.length} items`);
    } catch (err) {
      console.error('❌ Error cargando calles:', err);
    } finally {
      this.loadingCalles = false;
    }
  }

  async loadMoreCalles(event: any) {
    if (this.callesPage >= this.callesLastPage) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }
    this.callesPage++;
    await this.loadCalles();
    event.target.complete();
  }

  // --- VEHÍCULOS EXTERNOS ---
  async loadVehiculosExtern() {
    this.loadingVehiculos = true;
    try {
      const perfil = environment.perfil_id || '';
      const res = await this.dataService.fetchVehiculosExtern(perfil, 1);
      this.vehiculosExternos = Array.isArray(res?.data ?? res) ? (res.data ?? res) : [];
      console.log('✅ Vehículos externos cargados:', this.vehiculosExternos.length);
    } catch (err) {
      console.error('❌ Error cargando vehículos externos:', err);
      this.vehiculosExternos = [];
    } finally {
      this.loadingVehiculos = false;
    }
  }

  // --- Refrescar pantalla ---
  doRefresh(event: any) {
    Promise.all([
      this.loadCalles(true),
      this.loadVehiculosExtern()
    ]).finally(() => event.target.complete());
  }

  // --- Sincronización manual ---
  async forceSyncCalles() {
    const token = localStorage.getItem('token') || '';
    const url = `${environment.miurlserve}/sync/calles`;
    try {
      const res = await CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${token}` } });
      console.log('🔄 Sync calles →', res);
      await this.loadCalles(true);
      alert('Sincronización de calles completada.');
    } catch (err) {
      console.error('❌ Error sincronizando calles:', err);
      alert('Error al sincronizar calles.');
    }
  }

  async forceSyncVehiculos() {
    const token = localStorage.getItem('token') || '';
    const url = `${environment.miurlserve}/sync/vehiculos`;
    try {
      const res = await CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${token}` } });
      console.log('🔄 Sync vehículos →', res);
      await this.loadVehiculosExtern();
      alert('Sincronización de vehículos completada.');
    } catch (err) {
      console.error('❌ Error sincronizando vehículos:', err);
      alert('Error al sincronizar vehículos.');
    }
  }
}
