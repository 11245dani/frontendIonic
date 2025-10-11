import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
  IonRefresher, IonRefresherContent, IonButton, IonSpinner, IonList,
  IonSearchbar, IonButtons, IonAccordionGroup, IonAccordion
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel,
    IonRefresher, IonRefresherContent, IonButton, IonSpinner, IonList,
    IonSearchbar, IonButtons, IonAccordionGroup, IonAccordion
  ]
})
export class Tab1Page implements OnInit, AfterViewInit {

  // --- CALLES ---
  calles: any[] = [];
  filteredCalles: any[] = [];
  paginatedCalles: any[] = [];
  loadingCalles = false;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  searchQuery = '';
  selectedCalle: any = null;

  // --- RUTAS ---
  rutas: any[] = [];
  filteredRutas: any[] = [];
  paginatedRutas: any[] = [];
  loadingRutas = false;
  currentPageRutas = 1;
  totalPagesRutas = 1;
  searchRuta = '';
  selectedRuta: any = null;

  // --- MAPA ---
  private map!: L.Map;
  private callesLayer!: L.LayerGroup;
  private rutasLayer!: L.LayerGroup;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadCalles();
    this.loadRutas();
  }

  ngAfterViewInit(): void {}

  // ================================================================
  // ============= CONFIGURACIÓN DEL MAPA ===========================
  // ================================================================
  ionViewDidEnter() {
    if (this.map) {
      this.map.invalidateSize();
    } else {
      this.initMap().then(() => {
        this.drawCallesOnMap(this.calles);
        this.drawRutasOnMap(this.rutas);
      });
    }
  }

  private async initMap(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.map) this.map.remove();

        // 🔒 Definir límites aproximados de Buenaventura (latitud/longitud)
        const bounds = L.latLngBounds(
          [3.80, -77.15], // suroeste
          [3.95, -76.95]  // noreste
        );

        this.map = L.map('map', {
          center: [3.8801, -77.0312],
          zoom: 14,
          maxBounds: bounds,              // restringe a Buenaventura
          maxBoundsViscosity: 1.0,        // hace que rebote al intentar salir
          minZoom: 12,                    // evita alejar demasiado
          maxZoom: 19
        });

        const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(this.map);

        this.callesLayer = L.layerGroup().addTo(this.map);
        this.rutasLayer = L.layerGroup().addTo(this.map);

        const overlayMaps: Record<string, L.Layer> = {
          '🛣️ Calles': this.callesLayer,
          '🚍 Rutas': this.rutasLayer
        };

        L.control.layers({ 'Mapa Base': baseLayer }, overlayMaps, { collapsed: false }).addTo(this.map);

        setTimeout(() => {
          this.map.invalidateSize();
          resolve();
        }, 400);
      }, 300);
    });
  }

  // =============================================================
  // ================= SELECCIÓN Y LIMPIEZA ======================
  // =============================================================

  public selectCalle(calle: any) {
    if (this.selectedCalle?.id === calle.id) {
      this.clearSelectedCalle();
    } else {
      this.selectedCalle = calle;
    }
    this.drawCallesOnMap(this.calles);
  }

  public clearSelectedCalle() {
    this.selectedCalle = null;
    this.drawCallesOnMap(this.calles);
  }

  public selectRuta(ruta: any) {
    if (this.selectedRuta?.id === ruta.id) {
      this.clearSelectedRuta();
    } else {
      this.selectedRuta = ruta;
    }
    this.drawRutasOnMap(this.rutas);
  }

  public clearSelectedRuta() {
    this.selectedRuta = null;
    this.drawRutasOnMap(this.rutas);
  }

  // ==============================================================
  // ========================== CALLES ============================
  // ==============================================================

  async loadCalles(refresh = false) {
    this.loadingCalles = true;
    try {
      const response = await this.dataService.fetchCalles();
      const items = response?.data?.data ?? response?.data ?? response ?? [];
      this.calles = [...items];
      this.filteredCalles = [...this.calles];
      this.updatePagination();
      this.drawCallesOnMap(this.calles);
    } catch (err) {
      console.error('Error cargando calles:', err);
    } finally {
      this.loadingCalles = false;
    }
  }

  public drawCallesOnMap(calles: any[]) {
    if (!this.map) return;
    this.callesLayer.clearLayers();

    calles.forEach(calle => {
      try {
        const shape = JSON.parse(calle.shape);
        if (shape?.type === 'LineString') {
          const coords: [number, number][] = shape.coordinates.map((c: any) => [c[1], c[0]]);
          const color = this.selectedCalle?.id === calle.id ? '#ff6600' : '#5a7ba6';
          const polyline = L.polyline(coords, {
            color,
            weight: 4,
            opacity: 0.9
          }).addTo(this.callesLayer);

          polyline.bindPopup(`<b>${calle.nombre ?? calle.name ?? 'Sin nombre'}</b>`);

          if (this.selectedCalle?.id === calle.id) {
            const bounds = L.latLngBounds(coords);
            this.map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (e) {
        console.warn('No se pudo dibujar la calle:', calle.nombre, e);
      }
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredCalles.length / this.itemsPerPage);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedCalles = this.filteredCalles.slice(start, end);
  }

  async forceSyncCalles() {
    const token = localStorage.getItem('token') || '';
    const url = `${environment.miurlserve}/sync/calles`;
    try {
      await CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${token}` } });
      await this.loadCalles(true);
      alert('Sincronización de calles completada.');
    } catch (err) {
      console.error('Error sincronizando calles:', err);
      alert('Error al sincronizar calles.');
    }
  }

  filterCalles(event: any) {
    const query = event.target.value?.toLowerCase() || '';
    this.filteredCalles = this.calles.filter(c =>
      (c.nombre ?? c.name ?? '').toLowerCase().includes(query)
    );
    this.updatePagination();
  }

  clearSelection() {
    this.selectedCalle = null;
    this.searchQuery = '';
    this.filteredCalles = [...this.calles];
    this.updatePagination();
    this.drawCallesOnMap(this.calles);
  }

  // ==============================================================
  // =========================== RUTAS =============================
  // ==============================================================

  async loadRutas(refresh = false) {
    this.loadingRutas = true;
    try {
      const token = localStorage.getItem('token') || '';
      const url = `${environment.miurlserve}/rutas`;
      const res = await CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${token}` } });
      const items = res?.data ?? [];
      this.rutas = Array.isArray(items) ? items : items.data ?? [];
      this.filteredRutas = [...this.rutas];
      this.updatePaginationRutas();
      this.drawRutasOnMap(this.rutas);
    } catch (err) {
      console.error('Error cargando rutas:', err);
    } finally {
      this.loadingRutas = false;
    }
  }

  public drawRutasOnMap(rutas: any[]) {
    if (!this.map) return;
    this.rutasLayer.clearLayers();

    rutas.forEach(ruta => {
      try {
        let shape = ruta.shape;
        if (typeof shape === 'string') shape = JSON.parse(shape);

        if (shape?.type === 'MultiLineString') {
          shape.coordinates.forEach((segmento: any) => {
            const coords: [number, number][] = segmento.map((c: any) => [c[1], c[0]]);
            this.addRutaPolyline(coords, ruta);
          });
        } else if (shape?.type === 'LineString') {
          const coords: [number, number][] = shape.coordinates.map((c: any) => [c[1], c[0]]);
          this.addRutaPolyline(coords, ruta);
        } else if (Array.isArray(shape)) {
          const coords: [number, number][] = shape.map((c: any) => [c[1], c[0]]);
          this.addRutaPolyline(coords, ruta);
        }

      } catch (e) {
        console.warn('No se pudo dibujar la ruta:', ruta.nombre_ruta, e);
      }
    });
  }

  private addRutaPolyline(coords: [number, number][], ruta: any) {
    const color = this.selectedRuta?.id === ruta.id ? '#ff0000' : '#00cc44';
    const polyline = L.polyline(coords, {
      color,
      weight: 6,
      opacity: 0.95
    }).addTo(this.rutasLayer);

    polyline.bindPopup(`<b>${ruta.nombre_ruta ?? 'Ruta sin nombre'}</b>`);

    if (this.selectedRuta?.id === ruta.id) {
      const bounds = L.latLngBounds(coords);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  updatePaginationRutas() {
    this.totalPagesRutas = Math.ceil(this.filteredRutas.length / this.itemsPerPage);
    const start = (this.currentPageRutas - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedRutas = this.filteredRutas.slice(start, end);
  }

  async forceSyncRutas() {
    const token = localStorage.getItem('token') || '';
    const url = `${environment.miurlserve}/rutas/sync`;
    const user_id = localStorage.getItem('user_id') || '1';
    try {
      await CapacitorHttp.post({
        url,
        headers: { Authorization: `Bearer ${token}` },
        data: { user_id }
      });
      await this.loadRutas(true);
      alert('Sincronización de rutas completada.');
    } catch (err) {
      console.error('Error sincronizando rutas:', err);
      alert('Error al sincronizar rutas.');
    }
  }

  filterRutas(event: any) {
    const query = event.target.value?.toLowerCase() || '';
    this.filteredRutas = this.rutas.filter(r =>
      (r.nombre_ruta ?? '').toLowerCase().includes(query)
    );
    this.updatePaginationRutas();
  }

  clearRutaSelection() {
    this.selectedRuta = null;
    this.searchRuta = '';
    this.filteredRutas = [...this.rutas];
    this.updatePaginationRutas();
    this.drawRutasOnMap(this.rutas);
  }
}
