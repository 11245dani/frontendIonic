import { Component, AfterViewInit, OnDestroy } from '@angular/core';
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
import * as L from 'leaflet';
import 'leaflet-rotatedmarker';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { environment } from 'src/environments/environment';
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
export class CiudadanoHomePage implements AfterViewInit, OnDestroy {
  user: any = null;
  private map!: L.Map;
  private callesLayer!: L.LayerGroup;
  private rutasLayer!: L.LayerGroup;
  private recorridoLayer!: L.LayerGroup;
  private userMarker!: L.Marker;
  private watchId: string | null = null;
  private syncInterval: any;
  calles: any[] = [];
  rutas: any[] = [];
  activeRecorridos: any[] = [];
  private vehicleMarkers: L.Marker[] = [];
  mostrarCalles = true;
  mostrarRutas = true;
  currentPosition: { lat: number, lng: number } | null = null;
  private readonly isWeb = Capacitor.getPlatform() === 'web';
  constructor(private router: Router) {
    const userData = localStorage.getItem('user');
    if (userData) this.user = JSON.parse(userData);
    this.loadCalles();
    this.loadRutas();
    this.syncInterval = setInterval(() => this.syncData(), 30 * 1000); // Refresh every 30 seconds
  }
  ngAfterViewInit(): void {
    setTimeout(async () => {
      await this.initMap();
      this.drawCallesOnMap(this.calles);
      this.drawActiveRecorridosOnMap();
      this.showCurrentPosition();
    }, 200);
  }
  ngOnDestroy(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.clearWatchGeneric(this.watchId);
  }
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
  irPerfil() {
    this.router.navigate(['/ciudadano/perfil']);
  }
  private async initMap(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.map) this.map.remove();
        const bounds = L.latLngBounds([3.80, -77.15], [3.95, -76.95]);
        this.map = L.map('map', {
          center: [3.8801, -77.0312],
          zoom: 14,
          maxBounds: bounds,
          maxBoundsViscosity: 1.0,
          minZoom: 12,
          maxZoom: 19
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(this.map);
        this.callesLayer = L.layerGroup().addTo(this.map);
        this.rutasLayer = L.layerGroup().addTo(this.map);
        this.recorridoLayer = L.layerGroup().addTo(this.map);
        const customControl = new (L.Control.extend({
          onAdd: () => {
            const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            div.style.background = 'white';
            div.style.padding = '6px';
            div.style.fontSize = '13px';
            div.style.boxShadow = '0 0 4px rgba(255, 255, 255, 0.36)';
            div.innerHTML = `<label><input type="checkbox" id="chkCalles" checked> Calles</label><br> <label><input type="checkbox" id="chkRutas" checked> Rutas Activas</label> `;
            return div;
          }
        }))({ position: 'topright' });
        customControl.addTo(this.map);
        setTimeout(() => {
          const chkCalles = document.getElementById('chkCalles') as HTMLInputElement;
          const chkRutas = document.getElementById('chkRutas') as HTMLInputElement;
          chkCalles.addEventListener('change', () => this.toggleCalles());
          chkRutas.addEventListener('change', () => this.toggleRutas());
        }, 500);
        // Nuevo botón para centrar en la posición actual
        const centerControl = new (L.Control.extend({
          onAdd: (map: L.Map) => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            const button = L.DomUtil.create('a', 'leaflet-control-center', container);
            button.innerHTML = '📍';
            button.style.backgroundColor = 'white';
            button.style.width = '30px';
            button.style.height = '30px';
            button.style.display = 'flex';
            button.style.alignItems = 'center';
            button.style.justifyContent = 'center';
            button.style.cursor = 'pointer';
            button.title = 'Centrar en mi posición';
            L.DomEvent.on(button, 'click', (e) => {
              L.DomEvent.stopPropagation(e);
              if (this.currentPosition) {
                this.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15);
              } else {
                alert('No se ha detectado la posición actual.');
              }
            });
            return container;
          }
        }))({ position: 'bottomright' });
        centerControl.addTo(this.map);
        resolve();
      }, 300);
    });
  }
  private async requestLocationPermission(): Promise<boolean> {
    if (!this.isWeb) {
      try {
        const perm = await Geolocation.requestPermissions();
        if ((perm as any).location && (perm as any).location === 'denied') return false;
        return true;
      } catch (e) {
        console.warn('requestPermissions error (native):', e);
        return false;
      }
    }
    try {
      if ('permissions' in navigator) {
        const status = await (navigator as any).permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') return false;
        return true;
      } else {
        return 'geolocation' in navigator;
      }
    } catch (e) {
      console.warn('requestPermissions error (web):', e);
      return 'geolocation' in navigator;
    }
  }
  private async getCurrentPositionWrapper(options: PositionOptions = { enableHighAccuracy: true, timeout: 15000 }): Promise<{ coords: { latitude: number; longitude: number; accuracy: number } }> {
    if (!this.isWeb) {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: !!options.enableHighAccuracy, timeout: options.timeout });
      return pos as any;
    }
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('Geolocalización no disponible en este navegador'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } }),
        (err) => reject(err),
        options
      );
    });
  }
  private async watchPositionWrapper(successCb: (pos: any) => void, errorCb?: (err: any) => void, options: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }): Promise<string> {
    if (!this.isWeb) {
      type NativePosition = { coords: { latitude: number; longitude: number; accuracy?: number } };
      type NativeWatchId = string | number;
      const idRaw: NativeWatchId = (await Geolocation.watchPosition(
        options as any,
        (position: NativePosition | null, err?: any) => {
          if (err) {
            if (errorCb) errorCb(err);
            else console.error('watchPosition error (native):', err);
            return;
          }
          if (position) successCb(position);
        }
      )) as unknown as NativeWatchId;
      return String(idRaw);
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        successCb({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } });
      },
      (err) => {
        if (errorCb) errorCb(err);
        else console.error('watchPosition error (web):', err);
      },
      options
    );
    return String(id);
  }
  private async clearWatchGeneric(id: string | null) {
    if (!id) return;
    if (!this.isWeb) {
      try {
        await Geolocation.clearWatch({ id });
      } catch (e) {
        try {
          await Geolocation.clearWatch({ id: String(id) });
        } catch (e2) {
          console.warn('clearWatch (native) fallback error:', e2);
        }
      }
      return;
    }
    try {
      const numeric = Number(id);
      if (!isNaN(numeric)) navigator.geolocation.clearWatch(numeric);
    } catch (e) {
      console.warn('clearWatch (web) error:', e);
    }
  }
  async showCurrentPosition() {
    try {
      const allowed = await this.requestLocationPermission();
      if (!allowed) {
        console.warn('Permisos de ubicación no concedidos');
        return;
      }
      const pos: any = await this.getCurrentPositionWrapper({ enableHighAccuracy: true, timeout: 15000 });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      console.log('Posición inicial:', { lat, lng, accuracy: pos.coords.accuracy });
      this.currentPosition = { lat, lng };
      this.setUserMarker(lat, lng, '📍 Estás aquí', true);
      const id = await this.watchPositionWrapper(
        (p) => {
          if (p && p.coords) {
            const plat = p.coords.latitude;
            const plng = p.coords.longitude;
            console.log('Posición actualizada:', { lat: plat, lng: plng, accuracy: p.coords.accuracy });
            this.currentPosition = { lat: plat, lng: plng };
            this.setUserMarker(plat, plng, '📍 Estás aquí', false);
          }
        },
        (err) => {
          console.error('Watch error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
      this.watchId = id;
    } catch (err) {
      console.error('Error ubicación:', err);
    }
  }
  private setUserMarker(lat: number, lng: number, popup: string, center: boolean = false) {
    if (!this.map) return;
    if (!this.userMarker) {
      this.userMarker = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png',
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        })
      }).addTo(this.map).bindPopup(popup).openPopup();
    } else {
      this.userMarker.setLatLng([lat, lng]);
    }
    if (center) {
      this.map.setView([lat, lng], 15);
    }
  }
  private async syncData() {
    await Promise.all([this.loadCalles(true), this.loadRutas(true), this.loadActiveRecorridos()]);
    this.drawCallesOnMap(this.calles);
    this.drawActiveRecorridosOnMap();
  }
  async loadCalles(refresh = false) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const baseUrl = environment.miurlserve;
      let url = `${baseUrl}/calles`;
      if (Capacitor.getPlatform() === 'web') {
        url = `/api/calles`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Error fetching calles');
        return;
      }
      const data = await res.json();
      this.calles = Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      console.error('Error calles:', err);
    }
  }
  private drawCallesOnMap(calles: any[]) {
    if (!this.map) return;
    this.callesLayer.clearLayers();
    calles.forEach(calle => {
      try {
        let shape = calle.shape;
        if (typeof shape === 'string') {
          shape = JSON.parse(shape);
        }
        if (shape?.type === 'LineString') {
          const coords = shape.coordinates.map((c: any) => [c[1], c[0]]);
          L.polyline(coords, { color: '#5a7ba6', weight: 4, opacity: 0.9 }).addTo(this.callesLayer);
        }
      } catch (e) {
        console.warn('Error calle:', calle.nombre, e);
      }
    });
  }
  async loadRutas(refresh = false) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const baseUrl = environment.miurlserve;
      let url = `${baseUrl}/rutas`;
      if (Capacitor.getPlatform() === 'web') {
        url = `/api/rutas`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error('Error fetching rutas');
        return;
      }
      const data = await res.json();
      this.rutas = Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      console.error('❌ Error rutas:', err);
    }
  }
  async loadActiveRecorridos() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const baseUrl = environment.miurlserve;
      let url = `${baseUrl}/recorridos`;
      if (Capacitor.getPlatform() === 'web') {
        url = `/api/recorridos`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error fetching recorridos: Status ${res.status}, Message: ${errorText}`);
        return;
      }
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError, 'Text received:', text);
        return;
      }
      this.activeRecorridos = (Array.isArray(data) ? data : data.data || []).filter((rec: any) => rec.estado === 'en_curso');
      console.log('Active Recorridos:', this.activeRecorridos);
      // Fetch last position for each
      await Promise.all(this.activeRecorridos.map(async (rec: any) => {
        try {
          let posUrl = `${baseUrl}/recorridos/${rec.id}/posiciones`;
          if (Capacitor.getPlatform() === 'web') {
            posUrl = `/api/recorridos/${rec.id}/posiciones`;
          }
          const posRes = await fetch(posUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!posRes.ok) {
            const posErrorText = await posRes.text();
            console.error(`Error fetching positions for ${rec.id}: Status ${posRes.status}, Message: ${posErrorText}`);
            return;
          }
          const positionsText = await posRes.text();
          let positionsData;
          try {
            positionsData = JSON.parse(positionsText);
          } catch (parseError) {
            console.error('Error parsing positions JSON:', parseError, 'Text received:', positionsText);
            return;
          }
          const positions = Array.isArray(positionsData) ? positionsData : positionsData.data || [];
          if (positions.length > 0) {
            // Assume positions are sorted by created_at ascending
            rec.lastPosition = positions[positions.length - 1];
          }
          console.log(`Positions for ${rec.id}:`, positions);
        } catch (err) {
          console.error(`Error fetching positions for ${rec.id}:`, err);
        }
      }));
    } catch (err) {
      console.error('Error general en loadActiveRecorridos:', err);
    }
  }
  private drawActiveRecorridosOnMap() {
    if (!this.map) return;
    this.rutasLayer.clearLayers();
    this.vehicleMarkers.forEach(marker => this.recorridoLayer.removeLayer(marker));
    this.vehicleMarkers = [];
    const drawnRutas = new Set<string>();
    this.activeRecorridos.forEach((rec: any) => {
      const ruta = this.rutas.find(r => r.api_id === rec.ruta_id);
      if (!ruta || drawnRutas.has(ruta.api_id)) return;
      drawnRutas.add(ruta.api_id);
      try {
        let shape: any = typeof ruta.shape === 'string' ? JSON.parse(ruta.shape) : ruta.shape;
        if (!shape || !shape.coordinates) return;
        const drawLine = (coords: any[]) => {
          if (!Array.isArray(coords) || coords.length === 0) return;
          const latlngs = coords.map(c => [c[1], c[0]]);
          L.polyline(latlngs, { color: '#ff3333', weight: 5, opacity: 0.95 }).addTo(this.rutasLayer);
        };
        if (shape.type === 'LineString') {
          drawLine(shape.coordinates);
        } else if (shape.type === 'MultiLineString') {
          shape.coordinates.forEach(drawLine);
        }
      } catch (e) {
        console.warn('Error drawing active ruta:', e);
      }
      // Add vehicle marker if last position
      if (rec.lastPosition) {
        const { latitud, longitud } = rec.lastPosition;
        const marker = L.marker([latitud, longitud], {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/320/320424.png', // Vehicle icon
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).addTo(this.recorridoLayer).bindPopup(`Vehículo en ruta ${ruta?.nombre_ruta || ''}`);
        this.vehicleMarkers.push(marker);
      }
    });
  }
  toggleCalles() {
    this.mostrarCalles = !this.mostrarCalles;
    this.mostrarCalles ? this.map.addLayer(this.callesLayer) : this.map.removeLayer(this.callesLayer);
  }
  toggleRutas() {
    this.mostrarRutas = !this.mostrarRutas;
    this.mostrarRutas ? this.map.addLayer(this.rutasLayer) : this.map.removeLayer(this.rutasLayer);
  }
}