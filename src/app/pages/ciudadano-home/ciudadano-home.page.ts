import { Component, OnInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

import { environment } from 'src/environments/environment';
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonProgressBar,
  AlertController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

// Augment Leaflet types for rotated marker plugin
declare module 'leaflet' {
  interface MarkerOptions {
    rotationAngle?: number;
    rotationOrigin?: string;
  }
  interface Marker {
    setRotationAngle(angle: number): this;
    setRotationOrigin(origin: string): this;
  }
}

@Component({
  selector: 'app-ciudadano-home',
  templateUrl: './ciudadano-home.page.html',
  styleUrls: ['./ciudadano-home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonApp,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonProgressBar
  ]
})
export class CiudadanoHomePage implements OnInit, OnDestroy {
  private map!: L.Map;
  private activePathsLayer!: L.LayerGroup;
  private allRutasGeometries: Map<string, L.LatLng[]> = new Map();
  private routeLengths: Map<string, number> = new Map();
  private markers: Map<string, L.Marker> = new Map();
  private travelledLines: Map<string, L.Polyline> = new Map();
  private fullRouteLines: Map<string, L.Polyline> = new Map();
  private activeRecorridosData: Map<string, any> = new Map();
  private intervalId: any;

  public recorridosUI: { id: string; nombreRuta: string; progreso: number }[] = [];

  private userLocationMarker: L.Marker | null = null;
  private locationWatchId: string | null = null;
  private readonly isWeb = Capacitor.getPlatform() === 'web';
  private averageSpeedKmh = 20;

  constructor(private router: Router, private alertController: AlertController) {}

  ngOnInit() {
    setTimeout(() => {
      this.initMap();
      this.loadAllRutas().then(() => {
        this.loadActiveRecorridos();
        this.intervalId = setInterval(() => this.loadActiveRecorridos(), 8000);
        this.showCurrentUserPosition();
      });
    }, 500);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.clearWatchGeneric(this.locationWatchId);
    if (this.map) this.map.remove();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  centerOnUser() {
    if (this.userLocationMarker) {
      this.map.setView(this.userLocationMarker.getLatLng(), 15);
    }
  }

  centerOnRecorrido(recorridoId: string) {
    const marker = this.markers.get(recorridoId);
    if (marker) {
      this.map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  }

  private initMap() {
    if (this.map) this.map.remove();
    this.map = L.map('map').setView([3.8801, -77.0312], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.activePathsLayer = L.layerGroup().addTo(this.map);

    const bounds = L.latLngBounds(L.latLng(3.80, -77.15), L.latLng(3.95, -76.95));
    this.map.setMaxBounds(bounds);
    this.map.setMinZoom(12);

    this.createCustomMapControls();
  }

  private createCustomMapControls() {
    const CenterControl = L.Control.extend({
        onAdd: (map: L.Map) => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.innerHTML = '📍';
            container.onclick = () => this.centerOnUser();
            return container;
        }
    });
    new CenterControl({ position: 'topright' }).addTo(this.map);

    const LogoutControl = L.Control.extend({
        onAdd: (map: L.Map) => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom logout-control');
            container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
            container.onclick = () => this.logout();
            return container;
        }
    });
    new LogoutControl({ position: 'topright' }).addTo(this.map);
  }

  private async loadAllRutas(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const url = `${environment.miurlserve}/rutas`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Error al cargar todas las rutas');
      const data = await res.json();
      const todasLasRutas = data.data || data || [];

      this.allRutasGeometries.clear();
      this.routeLengths.clear();

      todasLasRutas.forEach((ruta: any) => {
        const routeCoords = this.parseShapeToCoords(ruta.shape);
        if (routeCoords && ruta.api_id) {
          this.allRutasGeometries.set(ruta.api_id, routeCoords);
          const totalLength = this.calculatePolylineDistance(routeCoords);
          this.routeLengths.set(ruta.api_id, totalLength);
        }
      });
    } catch (err) {
      console.error('Error en loadAllRutas:', err);
    }
  }

  private async loadActiveRecorridos() {
    try {
      const token = localStorage.getItem('token');
      if (!token) { this.logout(); return; }

      const res = await fetch(`${environment.miurlserve}/recorridos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar recorridos');

      const json = await res.json();
      const activos = (json.recorridos || []).filter((r: any) => r.estado === 'en_curso');

      const activeIds = new Set(activos.map((r: any) => r.id));
      this.recorridosUI = this.recorridosUI.filter(rec => activeIds.has(rec.id));

      for (const rec of activos) {
        this.activeRecorridosData.set(rec.id, rec);
        const fullRouteGeom = this.allRutasGeometries.get(rec.ruta_id);
        if (!fullRouteGeom) continue;
        const pos = await this.getUltimaPosicion(rec.id);
        if (pos) {
          this.updateRecorridoOnMap(rec.id, pos, fullRouteGeom);
        }
      }
    } catch (err) {
      console.error('Error cargando recorridos activos:', err);
    }
  }

  private async getUltimaPosicion(recorridoId: string): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${environment.miurlserve}/recorridos/${recorridoId}/posiciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return null;

      const data = await res.json();
      const posiciones = data.data || [];

      if (posiciones.length === 0) return null;

      const ultima = posiciones[0];

      if (ultima.geom) {
        const geomData = JSON.parse(ultima.geom);
        if (geomData.type === 'Point' && geomData.coordinates) {
          const [longitud, latitud] = geomData.coordinates;
          return {
            latitud: latitud,
            longitud: longitud,
            heading: ultima.heading || 0
          };
        }
      }
      return null;
    } catch (e) {
      console.error('Fallo en getUltimaPosicion:', e);
      return null;
    }
  }

  private updateRecorridoOnMap(recorridoId: string, pos: any, fullRouteGeom: L.LatLng[]) {
    const rec = this.activeRecorridosData.get(recorridoId);
    if (!rec) return;

    const currentLatLng = L.latLng(pos.latitud, pos.longitud);

    const travelledCoords = this.calculateTravelledPath(fullRouteGeom, currentLatLng);
    const travelledDistance = travelledCoords ? this.calculatePolylineDistance(travelledCoords) : 0;
    const totalDistance = this.routeLengths.get(rec.ruta_id) || 0;
    const percent = totalDistance > 0 ? (travelledDistance / totalDistance) * 100 : 0;

    const popupContent = `<b>${rec.ruta?.nombre_ruta || 'Ruta'}</b><br>${percent.toFixed(0)}% completado`;

    const uiRecorrido = this.recorridosUI.find(r => r.id === recorridoId);
    if (uiRecorrido) {
      uiRecorrido.progreso = percent;
    } else {
      this.recorridosUI.push({ id: recorridoId, nombreRuta: rec.ruta?.nombre_ruta || 'Ruta Desconocida', progreso: percent });
    }

    let marker = this.markers.get(recorridoId);
    if (!marker) {
      marker = L.marker(currentLatLng, {
        icon: L.icon({ iconUrl: 'assets/icon/movimiento-de-camiones.png', iconSize: [32, 32], iconAnchor: [16, 32] }),
        rotationAngle: pos.heading,
        title: rec.ruta?.nombre_ruta || 'Vehículo',
      }).bindPopup(popupContent).addTo(this.map);
      this.markers.set(recorridoId, marker);
    } else {
      marker.setLatLng(currentLatLng);
      if (marker.setRotationAngle) {
        marker.setRotationAngle(pos.heading);
      }
      marker.setPopupContent(popupContent);
    }

    let fullRouteLine = this.fullRouteLines.get(recorridoId);
    if (!fullRouteLine) {
        fullRouteLine = L.polyline(fullRouteGeom, {
            color: '#28a745',
            weight: 5,
            opacity: 0.6
        }).addTo(this.activePathsLayer);
        this.fullRouteLines.set(recorridoId, fullRouteLine);
    }

    if (travelledCoords) {
        let travelledLine = this.travelledLines.get(recorridoId);
        if (!travelledLine) {
          travelledLine = L.polyline(travelledCoords, {
              color: '#0066FF',
              weight: 6,
              opacity: 1,
          }).addTo(this.activePathsLayer);
          this.travelledLines.set(recorridoId, travelledLine);
        } else {
          travelledLine.setLatLngs(travelledCoords);
        }
    }
  }

  private async showCurrentUserPosition(): Promise<void> {
    try {
      const allowed = await this.requestLocationPermission();
      if (!allowed) {
        console.warn('Permiso de ubicación denegado por el usuario.');
        return;
      }

      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      this.setUserLocationMarker([pos.coords.latitude, pos.coords.longitude], true);

      if (this.locationWatchId) {
        this.clearWatchGeneric(this.locationWatchId);
      }
      this.locationWatchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (position, err) => {
        if (position) {
          this.setUserLocationMarker([position.coords.latitude, position.coords.longitude], false);
        }
      });
    } catch (err) {
      console.error('Error obteniendo la ubicación del usuario:', err);
    }
  }

  private setUserLocationMarker(position: L.LatLngExpression, center: boolean): void {
    if (!this.map) return;
    const userIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng(position);
    } else {
      this.userLocationMarker = L.marker(position, { icon: userIcon })
        .addTo(this.map)
        .on('click', () => this.calculateAndShowETA());
    }

    if (center && this.userLocationMarker) {
      this.map.setView(this.userLocationMarker.getLatLng(), 15);
    }
  }

  private async requestLocationPermission(): Promise<boolean> {
    if (!this.isWeb) {
      const perm = await Geolocation.requestPermissions();
      return perm.location === 'granted' || perm.location === 'prompt';
    }
    return 'geolocation' in navigator;
  }

  private async clearWatchGeneric(id: string | null) {
    if (id) {
      await Geolocation.clearWatch({ id });
    }
  }

  async calculateAndShowETA() {
    if (!this.userLocationMarker) {
      this.showAlert('Ubicación no disponible', 'No podemos calcular el tiempo de llegada sin tu ubicación.');
      return;
    }
    if (this.markers.size === 0) {
      this.showAlert('Sin vehículos', 'No hay vehículos activos en este momento para calcular un tiempo de llegada.');
      return;
    }

    const userPos = this.userLocationMarker.getLatLng();
    let minEtaMinutes = Infinity;
    const relevanceThresholdMeters = 500;

    for (const [recorridoId, vehiculoMarker] of this.markers.entries()) {
        const rec = this.activeRecorridosData.get(recorridoId);
        if (!rec) continue;

        const fullRouteGeom = this.allRutasGeometries.get(rec.ruta_id);
        if (!fullRouteGeom) continue;

        const userProjection = this.findClosestPointOnPolyline(fullRouteGeom, userPos);
        if (!userProjection) continue;

        const distanceToRoute = this.haversineDistance(userPos, userProjection.point);
        if (distanceToRoute > relevanceThresholdMeters) {
            continue;
        }

        const vehiculoPos = vehiculoMarker.getLatLng();
        const travelledPath = this.calculateTravelledPath(fullRouteGeom, vehiculoPos);
        const travelledDistance = travelledPath ? this.calculatePolylineDistance(travelledPath) : 0;

        const distanceToUserPointOnRoute = userProjection.distanceFromStart;
        const remainingDistanceToUser = distanceToUserPointOnRoute - travelledDistance;

        if (remainingDistanceToUser > 0) {
            const etaSeconds = remainingDistanceToUser / (this.averageSpeedKmh * 1000 / 3600);
            const etaMinutes = etaSeconds / 60;
            minEtaMinutes = Math.min(minEtaMinutes, etaMinutes);
        }
    }

    if (minEtaMinutes === Infinity) {
        this.showAlert('Sin rutas cercanas', `Ningún vehículo activo se dirige a un punto de su ruta a menos de ${relevanceThresholdMeters}m de tu ubicación.`);
    } else {
        this.showAlert('Tiempo Estimado de Llegada', `El próximo camión llegará en aproximadamente ${minEtaMinutes.toFixed(0)} minutos.`);
    }
  }

  private findClosestPointOnPolyline(polyline: L.LatLng[], point: L.LatLng): {point: L.LatLng, distanceFromStart: number} | null {
      if (polyline.length < 2) return null;

      let closestOverall: {point: L.LatLng, distance: number, segmentIndex: number} | null = null;
      const segmentDistances = [];

      for (let i = 0; i < polyline.length - 1; i++) {
          const segmentStart = polyline[i];
          const segmentEnd = polyline[i+1];
          const segmentDistance = this.haversineDistance(segmentStart, segmentEnd);
          segmentDistances.push(segmentDistance);

          const projection = this.projectPointOnSegment(point, segmentStart, segmentEnd);
          if (closestOverall === null || projection.distance < closestOverall.distance) {
              closestOverall = { point: projection.point, distance: projection.distance, segmentIndex: i };
          }
      }

      if (!closestOverall) return null;

      let distanceFromStart = 0;
      for (let i = 0; i < closestOverall.segmentIndex; i++) {
          distanceFromStart += segmentDistances[i];
      }

      const finalSegmentStart = polyline[closestOverall.segmentIndex];
      distanceFromStart += this.haversineDistance(finalSegmentStart, closestOverall.point);

      return { point: closestOverall.point, distanceFromStart: distanceFromStart };
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }

  private calculatePolylineDistance(coords: L.LatLng[]): number {
      let distance = 0;
      for (let i = 0; i < coords.length - 1; i++) {
          distance += this.haversineDistance(coords[i], coords[i+1]);
      }
      return distance;
  }

  private calculateTravelledPath(routeCoords: L.LatLng[], currentPos: L.LatLng): L.LatLng[] | null {
    if (routeCoords.length < 2) return null;

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

    const path = routeCoords.slice(0, closestIndex + 1);
    path.push(closestPoint);
    return path;
  }

  private haversineDistance(a: L.LatLng, b: L.LatLng): number {
    const toRad = (v: number) => v * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const aa = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  }

  private projectPointOnSegment(p: L.LatLng, a: L.LatLng, b: L.LatLng): { point: L.LatLng, distance: number } {
    const latToMeter = (latDiff: number) => latDiff * 111320;
    const lonToMeter = (lonDiff: number, lat: number) => lonDiff * (111320 * Math.cos(lat * Math.PI/180));
    const Ax = lonToMeter(a.lng - p.lng, p.lat);
    const Ay = latToMeter(a.lat - p.lat);
    const Bx = lonToMeter(b.lng - p.lng, p.lat);
    const By = latToMeter(b.lat - p.lat);
    const ABx = Bx - Ax;
    const ABy = By - Ay;
    const APx = -Ax;
    const APy = -Ay;
    const ab2 = ABx * ABx + ABy * ABy;
    let t = ab2 === 0 ? 0 : (APx * ABx + APy * ABy) / ab2;
    t = Math.max(0, Math.min(1, t));
    const projX = Ax + ABx * t;
    const projY = Ay + ABy * t;
    const projLat = p.lat + projY / 111320;
    const projLon = p.lng + projX / (111320 * Math.cos(p.lat * Math.PI/180));
    const closestPoint = L.latLng(projLat, projLon);
    return { point: closestPoint, distance: this.haversineDistance(p, closestPoint) };
  }

  private parseShapeToCoords(shape: any): L.LatLng[] | null {
    try {
      const s = typeof shape === 'string' ? JSON.parse(shape) : shape;
      if (!s?.coordinates) return null;
      if (s.type === 'LineString') {
        return s.coordinates.map((c: number[]) => L.latLng(c[1], c[0]));
      } else if (s.type === 'MultiLineString') {
        return s.coordinates.flat().map((c: number[]) => L.latLng(c[1], c[0]));
      }
    } catch (e) { console.warn('Error parseando shape:', e); }
    return null;
  }

  private removeRecorridoFromMap(id: string) {
    this.markers.get(id)?.remove();
    this.travelledLines.get(id)?.remove();
    this.fullRouteLines.get(id)?.remove();
    this.markers.delete(id);
    this.travelledLines.delete(id);
    this.fullRouteLines.delete(id);
    this.recorridosUI = this.recorridosUI.filter(rec => rec.id !== id);
    this.activeRecorridosData.delete(id);
  }
}
