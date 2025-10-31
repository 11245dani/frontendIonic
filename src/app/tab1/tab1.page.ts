import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonCardHeader, IonCardTitle, IonCardContent, IonCard } from '@ionic/angular/standalone';
import { DataService } from '../services/data.service';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { environment } from 'src/environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

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
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent
  ]
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {
  calles: any[] = [];
  rutas: any[] = [];
  intervalo: any;
  private map!: L.Map;
  private callesLayer!: L.LayerGroup;
  private rutasLayer!: L.LayerGroup;
  private recorridoLayer!: L.LayerGroup;
  private userMarker!: L.Marker;
  private watchId: string | null = null;
  private envioInterval: any;
  private syncInterval: any;
  private markerConductor!: L.Marker;
  selectedElement: L.Polyline | null = null;
  selectedOriginalColor: string | null = null;
  mostrarCalles = true;
  mostrarRutas = true;
  // ✅ Ruta seleccionada
  private selectedRuta: any = null;
  // Recorrido activo
  recorridoActivo: any = null;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadCalles();
    this.loadRutas();
    this.syncInterval = setInterval(() => this.syncData(), 5 * 60 * 1000);
    this.testIniciarRecorridoDirecto();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.envioInterval) clearInterval(this.envioInterval);
  }

  ionViewDidEnter() {
    if (this.map) {
      this.map.invalidateSize();
    } else {
      this.initMap().then(() => {
        this.drawCallesOnMap(this.calles);
        this.drawRutasOnMap(this.rutas);
        this.showCurrentPosition();
      });
    }
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
            div.style.background = 'black';
            div.style.padding = '6px';
            div.style.fontSize = '13px';
            div.style.boxShadow = '0 0 4px rgba(0,0,0,0.3)';
            div.innerHTML = `<label><input type="checkbox" id="chkCalles" checked> Calles</label><br> <label><input type="checkbox" id="chkRutas" checked> Rutas</label> `;
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
        resolve();
      }, 300);
    });
  }

  async showCurrentPosition() {
    try {
      if (!Capacitor.isNativePlatform()) {
        this.setUserMarker(3.8801, -77.0312, '📍 Posición simulada');
        return;
      }
      const perm = await Geolocation.requestPermissions();
      if (perm.location === 'denied') return;
      const pos = await Geolocation.getCurrentPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      this.setUserMarker(lat, lng, '📍 Estás aquí');
      this.watchId = await Geolocation.watchPosition({}, (p) => {
        if (p && this.userMarker) {
          this.userMarker.setLatLng([p.coords.latitude, p.coords.longitude]);
        }
      });
      await LocalNotifications.schedule({
        notifications: [{
          id: 1,
          title: 'Ubicación detectada',
          body: 'Posición actual registrada',
          schedule: { at: new Date(Date.now() + 1000) }
        }]
      });
    } catch (err) {
      console.error('Error ubicación:', err);
    }
  }

  private setUserMarker(lat: number, lng: number, popup: string) {
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
    this.map.setView([lat, lng], 15);
  }

  ionViewWillLeave() {
    if (this.watchId) Geolocation.clearWatch({ id: this.watchId });
  }

  private async syncData() {
    await Promise.all([this.loadCalles(true), this.loadRutas(true)]);
  }

  // =================== CALLES ===================
  async loadCalles(refresh = false) {
    try {
      const res = await this.dataService.fetchCalles();
      this.calles = res?.data?.data ?? res?.data ?? res ?? [];
      this.drawCallesOnMap(this.calles);
    } catch (err) {
      console.error('Error calles:', err);
    }
  }

  private drawCallesOnMap(calles: any[]) {
    if (!this.map) return;
    this.callesLayer.clearLayers();
    calles.forEach(calle => {
      try {
        const shape = JSON.parse(calle.shape);
        if (shape?.type === 'LineString') {
          const coords = shape.coordinates.map((c: any) => [c[1], c[0]]);
          const poly = L.polyline(coords, { color: '#5a7ba6', weight: 4, opacity: 0.9 })
            .addTo(this.callesLayer);
          poly.on('click', () => this.selectElement(poly, 'Calle', calle.nombre ?? 'Sin nombre'));
        }
      } catch (e) {
        console.warn('Error calle:', calle.nombre, e);
      }
    });
  }

  // =================== RUTAS ===================
  async loadRutas(refresh = false) {
    try {
      const token = localStorage.getItem('token') || '';
      const url = 'http://localhost:8000/api/rutas';
      const res = await CapacitorHttp.get({
        url,
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res?.data ?? [];
      this.rutas = Array.isArray(items) ? items : items.data ?? [];
      this.drawRutasOnMap(this.rutas);
    } catch (err) {
      console.error('❌ Error rutas:', err);
    }
  }

  private drawRutasOnMap(rutas: any[]) {
    if (!this.map) {
      console.warn('🗺️ No hay mapa inicializado todavía');
      return;
    }
    this.rutasLayer.clearLayers();
    rutas.forEach((ruta) => {
      try {
        let shape: any;
        if (typeof ruta.shape === 'string') {
          shape = JSON.parse(ruta.shape);
        } else {
          shape = ruta.shape;
        }
        if (!shape || !shape.coordinates) return;
        const drawLine = (coords: any[]) => {
          if (!Array.isArray(coords) || coords.length === 0) return;
          const latlngs = coords.map(c => [c[1], c[0]]);
          const poly = L.polyline(latlngs, { color: '#00cc44', weight: 5, opacity: 0.95 }).addTo(this.rutasLayer);
          // ✅ Guardar la ruta seleccionada al hacer clic
          poly.on('click', () => {
            this.selectedRuta = ruta;
            console.log('🛣️ Ruta seleccionada:', this.selectedRuta);
            this.selectElement(poly, 'Ruta', ruta.nombre_ruta ?? 'Sin nombre');
          });
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

  // =================== SELECCIÓN ===================
  private selectElement(poly: L.Polyline, tipo: string, nombre: string) {
    if (this.selectedElement) {
      this.selectedElement.setStyle({ color: this.selectedOriginalColor ?? '#5a7ba6', weight: 4 });
      this.selectedElement.closePopup();
    }
    this.selectedElement = poly;
    this.selectedOriginalColor = poly.options.color as string;
    poly.setStyle({ color: tipo === 'Calle' ? '#ff8800' : '#ff3333', weight: 7 });
    const popupContent = `<div style="display:flex;align-items:center;justify-content:space-between;min-width:120px;"> <b>${tipo}: ${nombre}</b> <button id="closeSelection" style="border:none;background:none;color:#555;font-weight:bold;cursor:pointer;">✖</button> </div> `;
    poly.bindPopup(popupContent).openPopup();
    setTimeout(() => {
      const btn = document.getElementById('closeSelection');
      if (btn) btn.onclick = () => this.clearSelection();
    }, 200);
  }

  private clearSelection() {
    if (this.selectedElement) {
      this.selectedElement.setStyle({ color: this.selectedOriginalColor ?? '#5a7ba6', weight: 4 });
      this.selectedElement.closePopup();
      this.selectedElement = null;
      this.selectedRuta = null; // ✅ limpia también la ruta seleccionada
    }
  }

  toggleCalles() {
    this.mostrarCalles = !this.mostrarCalles;
    this.mostrarCalles ? this.map.addLayer(this.callesLayer) : this.map.removeLayer(this.callesLayer);
  }

  toggleRutas() {
    this.mostrarRutas = !this.mostrarRutas;
    this.mostrarRutas ? this.map.addLayer(this.rutasLayer) : this.map.removeLayer(this.rutasLayer);
  }

  // =================== RECORRIDOS ===================
  async iniciarRecorrido() {
    // ✅ Debe haber una ruta seleccionada
    if (!this.selectedRuta) return alert('Seleccione una ruta para iniciar');
    const token = localStorage.getItem('token');
    if (!token) return alert('No hay token de sesión');
    const body = {
      ruta_id: this.selectedRuta.api_id, // ✅ usa la seleccionada
      vehiculo_id: '0199d01b-d17c-736f-9ab7-4a045d22cb94',
      perfil_id: 'fbfa2448-160e-496b-b58f-1048a3f3a2da',
    };
    const baseUrl = environment.miurlserve;
    try {
      console.log('🚀 Iniciando recorrido en:', `${baseUrl}/recorridos/iniciar`);
      console.log('🕵️ selectedRuta actual:', this.selectedRuta);

      let response: any;
      console.log('🌐 Base URL usada:', baseUrl);
      if (Capacitor.getPlatform() === 'web') {
        console.log('🌍 URL final usada para iniciar:', `${baseUrl}/recorridos/iniciar`);
        console.log('📦 Body enviado:', body);
         const res = await fetch('/api/recorridos/iniciar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
                'Accept': 'application/json',   // 👈 este es importante
              'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(body),
            credentials: 'include'
          });

        response = await res.json();
      } else {
        const res = await CapacitorHttp.post({
          url: `${baseUrl}/recorridos/iniciar`,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: body,
        });
        response = res.data;
      }
      this.recorridoActivo = response.recorrido;
      console.log('✅ Recorrido iniciado correctamente:', response);
      alert('Recorrido iniciado');
      this.iniciarEnvioPosiciones();
    } catch (err) {
      console.error('❌ Error al iniciar recorrido:', err);
    }
  }

  iniciarEnvioPosiciones() {
    if (!this.recorridoActivo) return;
    this.intervalo = setInterval(() => this.enviarPosicion(), 10000);
  }

 async enviarPosicion() {
  if (!this.recorridoActivo) return;
  const token = localStorage.getItem('token');
  const body = {
    recorrido_id: this.recorridoActivo.id,
    latitud: 4.60971,
    longitud: -74.08175,
  };
  const baseUrl = environment.miurlserve;
  try {
    let response: any;
    const res = await fetch(`${baseUrl}/recorridos/${this.recorridoActivo.id}/posiciones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    response = await res.json();
    console.log('📍 Posición enviada:', response);
  } catch (err) {
    console.error('❌ Error al enviar posición:', err);
  }
}

async finalizarRecorrido() {
  if (!this.recorridoActivo) return alert('No hay recorrido activo');
  const token = localStorage.getItem('token');
  const body = { recorrido_id: this.recorridoActivo.id };
  const baseUrl = environment.miurlserve;
  try {
    let response: any;
    const res = await fetch(`${baseUrl}/recorridos/${this.recorridoActivo.id}/finalizar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    response = await res.json();
    console.log('✅ Recorrido finalizado:', response);
    alert('Recorrido finalizado correctamente');
    clearInterval(this.intervalo);
    this.recorridoActivo = null;
  } catch (err) {
    console.error('❌ Error al finalizar recorrido:', err);
  }
}

async testIniciarRecorridoDirecto() {
  try {
    const res = await fetch('http://localhost:8000/api/recorridos/iniciar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        ruta_id: '01995543-bb09-724d-bdc8-0ee4a4acafa9',
        vehiculo_id: '0199d01b-d17c-736f-9ab7-4a045d22cb94',
        perfil_id: 'fbfa2448-160e-496b-b58f-1048a3f3a2da'
      }),
      credentials: 'include'
    });

    console.log('🔍 Estado respuesta:', res.status, res.statusText);
    const data = await res.json();
    console.log('📦 Respuesta completa:', data);
  } catch (err) {
    console.error('❌ Error en testIniciarRecorridoDirecto:', err);
  }
}


}