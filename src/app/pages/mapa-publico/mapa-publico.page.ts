import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonButton } from '@ionic/angular/standalone';
import * as L from 'leaflet';

@Component({
  selector: 'app-mapa-publico',
  templateUrl: './mapa-publico.page.html',
  styleUrls: ['./mapa-publico.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, IonButton],
})
export class MapaPublicoPage implements AfterViewInit {
  private map!: L.Map;
  private rutasLayer!: L.LayerGroup;
  public isLoading = true;

  constructor() {}

  async ngAfterViewInit(): Promise<void> {
    await this.initMap();
    await this.loadRutas();
  }

  private async initMap(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.map) this.map.remove();
        this.map = L.map('mapa-publico', {
          center: [3.8801, -77.0312],
          zoom: 13,
          minZoom: 12,
          maxZoom: 19,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(this.map);
        this.rutasLayer = L.layerGroup().addTo(this.map);
        resolve();
      }, 300);
    });
  }

  public async loadRutas(): Promise<void> {
    this.isLoading = true;
    try {
      const url = 'https://apidani.eleueleo.com/api/rutas';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`El servidor respondió con el estado: ${response.status}`);
      }

      const data = await response.json();
      const rutas = data.data || data;

      if (!Array.isArray(rutas) || rutas.length === 0) {
        throw new Error('No se recibieron datos de rutas o el formato es incorrecto.');
      }

      this.drawRutasOnMap(rutas);
    } catch (error) {
      console.error('Error cargando rutas públicas:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private drawRutasOnMap(rutas: any[]): void {
    if (!this.map || !this.rutasLayer || !Array.isArray(rutas)) return;
    this.rutasLayer.clearLayers();
    rutas.forEach((ruta) => {
      try {
        const shape = typeof ruta.shape === 'string' ? JSON.parse(ruta.shape) : ruta.shape;
        if (!shape || !shape.coordinates) return;
        const drawLine = (coords: any[]) => {
          if (!Array.isArray(coords) || coords.length === 0) return;
          const latlngs = coords.map(c => [c[1], c[0]]);
          L.polyline(latlngs, { color: '#00cc44', weight: 4, opacity: 0.7 }).addTo(this.rutasLayer);
        };
        if (shape.type === 'LineString') {
          drawLine(shape.coordinates);
        } else if (shape.type === 'MultiLineString') {
          shape.coordinates.forEach(drawLine);
        }
      } catch (e) {
        console.warn('Error al dibujar ruta:', e);
      }
    });
  }
}
