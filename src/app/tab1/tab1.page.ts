import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonRefresher, IonRefresherContent, IonButton, IonSpinner, IonList,
  IonSearchbar, IonButtons, IonAccordionGroup, IonAccordion
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
    IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
    IonRefresher, IonRefresherContent, IonButton, IonSpinner, IonList,
    IonSearchbar, IonButtons, IonAccordionGroup, IonAccordion
  ]
})
export class Tab1Page implements OnInit, AfterViewInit {
  calles: any[] = [];
  filteredCalles: any[] = [];
  paginatedCalles: any[] = [];
  loadingCalles = false;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  private map!: L.Map;
  private callesLayer = L.layerGroup();

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadCalles();
  }

  ngAfterViewInit(): void {
   
  }

  private initMap(): void {
    setTimeout(() => {
      if (this.map) {
        this.map.remove(); // previene errores de doble inicialización
      }

      this.map = L.map('map', {
        center: [3.8801, -77.0312],
        zoom: 14
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.map);

      this.callesLayer = L.layerGroup().addTo(this.map);

      // Ajustar tamaño del mapa al cargar
      setTimeout(() => {
        this.map.invalidateSize();
      }, 400);
    }, 300);
  }

      ionViewDidEnter() {
      if (this.map) {
        this.map.invalidateSize(); // reacomoda el mapa si ya existe
      } else {
        this.initMap();
      }
    }

  async loadCalles(refresh = false) {
    this.loadingCalles = true;
    try {
      const response = await this.dataService.fetchCalles();
      const items = response?.data?.data ?? response?.data ?? response ?? [];

      this.calles = [...items];
      this.filteredCalles = [...this.calles];
      this.updatePagination();
      this.drawCallesOnMap(this.paginatedCalles);

      console.log(`✅ Calles cargadas: ${items.length}`);
    } catch (err) {
      console.error('❌ Error cargando calles:', err);
    } finally {
      this.loadingCalles = false;
    }
  }

  private drawCallesOnMap(calles: any[]) {
    this.callesLayer.clearLayers();

    calles.forEach(calle => {
      try {
        const shape = JSON.parse(calle.shape);
        if (shape?.type === 'LineString') {
          const coords = shape.coordinates.map((c: any) => [c[1], c[0]]);
          L.polyline(coords, { color: 'blue', weight: 3 })
            .bindPopup(`<b>${calle.nombre}</b>`)
            .addTo(this.callesLayer);
        }
      } catch (e) {
        console.warn('No se pudo dibujar la calle:', calle.nombre, e);
      }
    });
  }

  filterCalles(event: any) {
    const query = event.target.value.toLowerCase();
    this.filteredCalles = this.calles.filter(
      c => (c.nombre ?? c.name ?? '').toLowerCase().includes(query) ||
           (c.barrio ?? '').toLowerCase().includes(query)
    );
    this.currentPage = 1;
    this.updatePagination();
    this.drawCallesOnMap(this.paginatedCalles);
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredCalles.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedCalles = this.filteredCalles.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
      this.drawCallesOnMap(this.paginatedCalles);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
      this.drawCallesOnMap(this.paginatedCalles);
    }
  }

  doRefresh(event: any) {
    this.loadCalles(true).finally(() => event.target.complete());
  }

  async forceSyncCalles() {
    const token = localStorage.getItem('token') || '';
    const url = `${environment.miurlserve}/sync/calles`;
    try {
      const res = await CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${token}` } });
      console.log('🔄 Sync calles →', res);
      await this.loadCalles(true);
      alert('Sincronización completada.');
    } catch (err) {
      console.error('Error sincronizando calles:', err);
      alert('Error al sincronizar calles.');
    }
  }
}
