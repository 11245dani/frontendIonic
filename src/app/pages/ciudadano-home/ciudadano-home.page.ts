import { Component, OnInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-geometryutil';   // ← ESTA LÍNEA ES LA QUE FALTABA
import 'leaflet-rotatedmarker';         // ← opcional, para rotar el marcador
import { Router } from '@angular/router';

import { environment } from 'src/environments/environment';import {
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


@Component({
  selector: 'app-ciudadano-home',
  templateUrl: './ciudadano-home.page.html',
  styleUrls: ['./ciudadano-home.page.scss'],
  imports: [
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
  ]
})
export class CiudadanoHomePage implements OnInit, OnDestroy {
  private map!: L.Map;
  private activeRecorridos: Map<string, any> = new Map(); // id_recorrido → datos
  private markers: Map<string, L.Marker> = new Map();
  private travelledLines: Map<string, L.Polyline> = new Map();
  private intervalId: any;

  constructor(private router: Router) {}

  ngOnInit() {
    setTimeout(() => this.initMap(), 500);
    this.loadActiveRecorridos();
    this.intervalId = setInterval(() => this.loadActiveRecorridos(), 8000); // cada 8 seg
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.map) this.map.remove();
  }
    logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
  irPerfil() {
    this.router.navigate(['/ciudadano/perfil']);
  }

  private initMap() {
    this.map = L.map('map').setView([3.8801, -77.0312], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    const bounds = L.latLngBounds(
      L.latLng(3.80, -77.15),
      L.latLng(3.95, -76.95)
    );
    this.map.setMaxBounds(bounds);
    this.map.setMinZoom(12);
  }

// ciudadano-mapa.page.ts  → 100% funcional con tu API actual
private async loadActiveRecorridos() {
  try {
    const base = environment.miurlserve;
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${base}/recorridos`, {
      headers: {
        'Authorization': `Bearer ${token}`, // ← Add token to headers
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) throw new Error('Error al cargar recorridos');

    const json = await res.json();
    const recorridos = json.recorridos || [];

    const activos = recorridos.filter((r: any) => r.estado === 'en_curso');

    // Limpiar los que ya no existen
    for (const id of this.activeRecorridos.keys()) {
      if (!activos.some((r: any) => r.id === id)) {
        this.removeRecorridoFromMap(id);
      }
    }

    // Procesar cada recorrido activo
    for (const rec of activos) {
      const rutaCoords = this.parseShape(rec.ruta?.shape);
      if (!rutaCoords || rutaCoords.length < 2) continue;

      // Obtener última posición
      const pos = await this.getUltimaPosicion(rec.id);
      if (!pos) continue;

      this.updateOrCreateRecorrido(rec, pos, rutaCoords);
    }

    // Zoom automático
    if (this.markers.size > 0) {
      const group = new L.FeatureGroup(Array.from(this.markers.values()));
      this.map.fitBounds(group.getBounds().pad(0.5));
    }

  } catch (err) {
    console.error('Error cargando recorridos:', err);
  }
}

// Nueva función: obtiene la última posición de un recorrido
private async getUltimaPosicion(recorridoId: string): Promise<any> {
  try {
    const base = environment.miurlserve;
    const res = await fetch(`${base}/recorridos/${recorridoId}/posiciones`);
    if (!res.ok) return null;
    const data = await res.json();
    const posiciones = data.posiciones || data.data || data || [];
    if (posiciones.length === 0) return null;

    // Ordenar por fecha y tomar la última
    const ultima = posiciones.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    return {
      latitud: parseFloat(ultima.latitud),
      longitud: parseFloat(ultima.longitud),
      heading: ultima.heading || 0
    };
  } catch (e) {
    console.warn('Error obteniendo posición de', recorridoId, e);
    return null;
  }
}
  private parseShape(shape: any): L.LatLng[] | null {
    try {
      const s = typeof shape === 'string' ? JSON.parse(shape) : shape;
      if (!s?.coordinates) return null;

      if (s.type === 'LineString') {
        return s.coordinates.map((c: number[]) => L.latLng(c[1], c[0]));
      }
      if (s.type === 'MultiLineString') {
        return s.coordinates.flat().map((c: number[]) => L.latLng(c[1], c[0]));
      }
    } catch (e) {
      console.warn('Error parseando shape:', e);
    }
    return null;
  }

  private updateOrCreateRecorrido(rec: any, pos: any, rutaCoords: L.LatLng[]) {
    const id = rec.id;
    const latlng = L.latLng(pos.latitud, pos.longitud);

    // Actualizar marcador
    let marker = this.markers.get(id);
    if (!marker) {
      marker = L.marker(latlng, {
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61155.png',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        }),
        title: rec.ruta?.nombre_ruta || 'Vehículo',
      })
        .bindPopup(`<b>${rec.ruta?.nombre_ruta || 'Ruta'}</b><br>Velocidad: ${pos.velocidad || 0} km/h`)
        .addTo(this.map);
      this.markers.set(id, marker);
    } else {
      marker.setLatLng(latlng);
      marker.setRotationAngle(pos.heading || 0);
    }

    // Actualizar línea recorrida (azul)
    let line = this.travelledLines.get(id);
    const travelledCoords = this.calculateTravelledPath(rutaCoords, latlng);

    if (!line) {
      line = L.polyline(travelledCoords, {
        color: '#0066FF',
        weight: 6,
        opacity: 0.9,
      }).addTo(this.map);
      this.travelledLines.set(id, line);
    } else {
      line.setLatLngs(travelledCoords);
    }
  }

  private calculateTravelledPath(routeCoords: L.LatLng[], currentPos: L.LatLng): L.LatLng[] {
    if (routeCoords.length < 2) return [currentPos];

    let closestDist = Infinity;
    let closestPoint: L.LatLng = currentPos;
    let closestIndex = 0;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segmentStart = routeCoords[i];
      const segmentEnd = routeCoords[i + 1];
      const proj = this.projectPointOnSegment(currentPos, segmentStart, segmentEnd);

      if (proj.distance < closestDist) {
        closestDist = proj.distance;
        closestPoint = proj.point;
        closestIndex = i;
      }
    }

    // Construir el camino recorrido
    const path = routeCoords.slice(0, closestIndex + 1);
    if (closestPoint.distanceTo(routeCoords[closestIndex]) > 1) {
      path.push(closestPoint); // solo si no está ya muy cerca
    }

    return path;
  }
  private projectPointOnSegment(p: L.LatLng, a: L.LatLng, b: L.LatLng): { point: L.LatLng; distance: number } {
    const latlngs = [a, b];
    const projected = L.GeometryUtil.closest(this.map, latlngs, p, true);

    // ← SOLUCIÓN: Manejo seguro de null
    if (!projected || projected.lat == null || projected.lng == null) {
      // Si falla la proyección, devolvemos el punto más cercano del segmento (a o b)
      const distToA = p.distanceTo(a);
      const distToB = p.distanceTo(b);
      return {
        point: distToA < distToB ? a : b,
        distance: Math.min(distToA, distToB)
      };
    }

    return {
      point: L.latLng(projected.lat, projected.lng),
      distance: projected.distance || p.distanceTo(a) // fallback
    };
  }

  private removeRecorridoFromMap(id: string) {
    this.markers.get(id)?.remove();
    this.travelledLines.get(id)?.remove();
    this.markers.delete(id);
    this.travelledLines.delete(id);
    this.activeRecorridos.delete(id);
  }
}