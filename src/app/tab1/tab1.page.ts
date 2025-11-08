import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-rotatedmarker'; // Asegúrate de instalar leaflet-rotatedmarker via npm
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonCardHeader, IonCardTitle, IonCardContent, IonCard, IonProgressBar, IonText, IonLabel } from '@ionic/angular/standalone';
import { DataService } from '../services/data.service';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { environment } from 'src/environments/environment';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { UserService } from '../services/user.service';
// Augment Leaflet types to include rotation properties
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
IonCardContent,
IonProgressBar,
IonText,
IonLabel
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
private watchId: string | null = null; // usado por showCurrentPosition (general)
private envioInterval: any;
private syncInterval: any;
private markerConductor: L.Marker | null = null;
private rutasPolylines: Record<string, L.Polyline[]> = {}; // map ruta.id -> array de polylines en mapa
private activeRouteId: string | null = null; // api_id de la ruta activa
private watchPositionId: string | null = null; // id devuelto por Geolocation.watchPosition (startRouteTracking)
private travelledLine: L.Polyline | null = null; // linea que muestra lo recorrido
private remainingLine: L.Polyline | null = null; // linea restante (opcional)
public routeProgress = { distanceMeters: 0, percent: 0 }; // estado para mostrar en UI
selectedElement: L.Polyline | null = null;
selectedOriginalColor: string | null = null;
mostrarCalles = true;
mostrarRutas = true;
// ✅ Ruta seleccionada
public selectedRuta: any = null;
// Recorrido activo
  recorridoActivo: any = null;
// Posición actual real
  currentPosition: { lat: number, lng: number } | null = null;
// Off-route threshold (metros)
private offRouteThreshold = 50; // alerta si distToSegment > 50m
private lastUpdateTime = 0;
private lastPosition: { lat: number, lng: number } | null = null;
private heading: number = 0; // Dirección en grados
private positionBuffer: { lat: number, lng: number }[] = []; // Buffer para suavizado
private readonly BUFFER_SIZE = 5; // Aumentado para mejor suavizado y precisión
private readonly MAX_SPEED_MS = 50; // Velocidad máxima esperada en m/s (~180 km/h)
// utilidad para saber si estamos en navegador
private readonly isWeb = Capacitor.getPlatform() === 'web';
// usuario cargado (para tomar vehículo)
public user: any = null;
constructor(private dataService: DataService, private userService: UserService) {}
ngOnInit(): void {
this.loadCalles();
this.loadRutas();
this.loadUser(); // <-- cargamos usuario para obtener vehículo asignado
this.syncInterval = setInterval(() => this.syncData(), 5 * 60 * 1000);
  }
ngAfterViewInit(): void {}
ngOnDestroy(): void {
if (this.syncInterval) clearInterval(this.syncInterval);
if (this.envioInterval) clearInterval(this.envioInterval);
this.stopRouteTracking();
// limpiar también el watch de showCurrentPosition
this.clearWatchGeneric(this.watchId);
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
// -------------------------
// Wrappers de geolocalización (funcionan en web y en nativo)
// -------------------------
private async requestLocationPermission(): Promise<boolean> {
// En nativo usamos Capacitor Geolocation.requestPermissions
if (!this.isWeb) {
try {
const perm = await Geolocation.requestPermissions();
// perm puede ser { location: 'granted' } o 'denied' o objeto distinto según plataforma
if ((perm as any).location && (perm as any).location === 'denied') return false;
// en android/ios puede venir 'granted' o 'prompt'
return true;
      } catch (e) {
        console.warn('requestPermissions error (native):', e);
return false;
      }
    }
// En web consultamos navigator.permissions si está disponible, sino checamos existencia
try {
if ('permissions' in navigator) {
// typescript necesita any
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const status = await (navigator as any).permissions.query({ name: 'geolocation' });
if (status.state === 'denied') return false;
// 'granted' o 'prompt' -> consideramos como permitido para intentar obtener posición
return true;
      } else {
return 'geolocation' in navigator;
      }
    } catch (e) {
      console.warn('requestPermissions error (web):', e);
return 'geolocation' in navigator;
    }
  }
private async getCurrentPositionWrapper(options: PositionOptions = { enableHighAccuracy: true, timeout: 15000 }): Promise<GeolocationPosition | { coords: { latitude: number; longitude: number; accuracy: number } }> {
if (!this.isWeb) {
// Capacitor Geolocation.getCurrentPosition devuelve objeto con .coords
const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: !!options.enableHighAccuracy, timeout: options.timeout });
return pos as any;
    }
// navegador web
return new Promise((resolve, reject) => {
if (!('geolocation' in navigator)) return reject(new Error('Geolocalización no disponible en este navegador'));
navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } }),
        (err) => reject(err),
options
      );
    });
  }
// devuelve id (string) independientemente de la plataforma
private async watchPositionWrapper(successCb: (pos: any) => void, errorCb?: (err: any) => void, options: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }): Promise<string> {
if (!this.isWeb) {
// Capacitor.watchPosition: recibe opciones y callback. Retorna watchId (en web plugin devuelve string, en native también).
// Notar: en algunas versiones devuelve number; normalizamos a string.
const id = await Geolocation.watchPosition(options as any, (position, err) => {
if (err) {
if (errorCb) errorCb(err);
else console.error('watchPosition error (native):', err);
return;
        }
if (position) successCb(position);
      }) as unknown as string;
return String(id);
    }
// navegador web: navigator.geolocation.watchPosition devuelve number
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
// algunos entornos nativos aceptan number; intentamos convertir
try {
await Geolocation.clearWatch({ id: String(id) });
        } catch (e2) {
          console.warn('clearWatch (native) fallback error:', e2);
        }
      }
return;
    }
// web
try {
const numeric = Number(id);
if (!isNaN(numeric)) navigator.geolocation.clearWatch(numeric);
    } catch (e) {
      console.warn('clearWatch (web) error:', e);
    }
  }
// Helper de notificaciones: intenta LocalNotifications y hace fallback a Web Notifications
private async notify(title: string, body: string) {
try {
// intentar plugin
if (!this.isWeb) {
await LocalNotifications.schedule({
          notifications: [{
            id: Math.floor(Math.random() * 90000) + 10000,
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) }
          }]
        });
return;
      }
    } catch (e) {
      console.warn('LocalNotifications error:', e);
    }
// fallback web
try {
if ('Notification' in window) {
if (Notification.permission === 'granted') {
new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
const p = await Notification.requestPermission();
if (p === 'granted') new Notification(title, { body });
        }
      } else {
        console.log('Notificación:', title, body);
      }
    } catch (e) {
      console.warn('Web Notification fallback error:', e);
    }
  }
// -------------------------
// Fin wrappers
// -------------------------
async showCurrentPosition() {
try {
const allowed = await this.requestLocationPermission();
if (!allowed) {
        console.warn('Permisos de ubicación no concedidos');
return;
      }
// obtener posición inicial
const pos: any = await this.getCurrentPositionWrapper({ enableHighAccuracy: true, timeout: 15000 });
const lat = pos.coords.latitude;
const lng = pos.coords.longitude;
console.log('Posición inicial:', { lat, lng, accuracy: pos.coords.accuracy });
this.currentPosition = { lat, lng };
this.setUserMarker(lat, lng, '📍 Estás aquí', true); // Centrar solo inicialmente
// iniciar watch (guardamos id para limpiar)
const id = await this.watchPositionWrapper(
        (p) => {
if (p && p.coords) {
const plat = p.coords.latitude;
const plng = p.coords.longitude;
console.log('Posición actualizada:', { lat: plat, lng: plng, accuracy: p.coords.accuracy });
this.currentPosition = { lat: plat, lng: plng };
this.setUserMarker(plat, plng, '📍 Estás aquí', false); // No centrar automáticamente
          }
        },
        (err) => {
          console.error('Watch error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
this.watchId = id;
// notificación de éxito (intento)
await this.notify('Ubicación detectada', 'Posición actual registrada');
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
ionViewWillLeave() {
// limpiamos ambos watches si existen
this.clearWatchGeneric(this.watchId);
this.clearWatchGeneric(this.watchPositionId);
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
// MODIFICACION: drawRutasOnMap -> almacenar polylines para cada ruta
private drawRutasOnMap(rutas: any[]) {
if (!this.map) {
      console.warn('🗺️ No hay mapa inicializado todavía');
return;
    }
this.rutasLayer.clearLayers();
this.rutasPolylines = {}; // reset
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
// almacenar
const key = ruta.api_id ?? String(ruta.id);
if (!this.rutasPolylines[key]) this.rutasPolylines[key] = [];
this.rutasPolylines[key].push(poly);
// click => seleccionar ruta
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
const vehiculoId = this.getAssignedVehicleId();
if (!vehiculoId) {
// si no tenemos vehículo asignado, avisamos y no iniciamos
return alert('No se encontró ningún vehículo asignado al usuario. Configure un vehículo antes de iniciar el recorrido.');
    }
const body = {
      ruta_id: this.selectedRuta.api_id, // ✅ usa la seleccionada
      vehiculo_id: vehiculoId,
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
'Accept': 'application/json', // 👈 este es importante
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
this.startRouteTracking();
    } catch (err) {
      console.error('❌ Error al iniciar recorrido:', err);
    }
  }
iniciarEnvioPosiciones() {
if (!this.recorridoActivo) return;
this.intervalo = setInterval(() => this.enviarPosicion(), 10000);
  }
async enviarPosicion() {
if (!this.recorridoActivo || !this.currentPosition) return;
const token = localStorage.getItem('token');
const body = {
      recorrido_id: this.recorridoActivo.id,
      latitud: this.currentPosition.lat,
      longitud: this.currentPosition.lng,
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
this.stopRouteTracking();
this.clearSelection(); // Limpiar selección y cerrar popup al finalizar
    } catch (err) {
      console.error('❌ Error al finalizar recorrido:', err);
    }
  }
// --- ADICION: utilidades matemáticas (haversine y proyección)
//
// devuelve distancia entre 2 puntos lat/lon en metros
private haversineDistance(a: [number,number], b: [number,number]) {
const toRad = (v: number) => v * Math.PI / 180;
const R = 6371000; // metros
const dLat = toRad(b[0]-a[0]);
const dLon = toRad(b[1]-a[1]);
const lat1 = toRad(a[0]);
const lat2 = toRad(b[0]);
const sinDlat = Math.sin(dLat/2);
const sinDlon = Math.sin(dLon/2);
const aa = sinDlat*sinDlat + Math.cos(lat1)*Math.cos(lat2)*sinDlon*sinDlon;
const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
return R * c;
  }
// proyecta punto P sobre el segmento AB (cada uno [lat, lon])
// retorna: { closest: [lat,lon], t: 0..1, distToSeg (m), distAlongSegmentFromA (m) }
private projectPointOnSegment(P: [number,number], A: [number,number], B: [number,number]) {
// convertimos a cartesianos aproximados usando lat/lon en rad con factor de distancia pequeña:
// para proyección en tramos cortos podemos usar una proyección simple basada en lon/lat convertidos a metros en equirectangular.
const latToMeter = (latDiff: number) => latDiff * 111320; // aprox
const lonToMeter = (lonDiff: number, lat: number) => lonDiff * (111320 * Math.cos(lat * Math.PI/180));
const Ax = lonToMeter(A[1]-P[1], P[0]);
const Ay = latToMeter(A[0]-P[0]);
const Bx = lonToMeter(B[1]-P[1], P[0]);
const By = latToMeter(B[0]-P[0]);
const ABx = Bx - Ax;
const ABy = By - Ay;
const APx = -Ax;
const APy = -Ay;
const ab2 = ABx*ABx + ABy*ABy;
let t = ab2 === 0 ? 0 : (APx*ABx + APy*ABy) / ab2;
if (t < 0) t = 0;
if (t > 1) t = 1;
// coordenada proyectada en metros respecto a P; convertimos de nuevo a lat/lon
const projX = Ax + ABx * t; // metros
const projY = Ay + ABy * t; // metros
// volver a lat/lon: invertimos lonToMeter/latToMeter (approx)
const projLat = P[0] + projY / 111320;
const projLon = P[1] + projX / (111320 * Math.cos(P[0] * Math.PI/180));
const closest: [number, number] = [projLat, projLon];
// distToSeg (m)
const distToSeg = Math.sqrt(Math.pow(projX,2) + Math.pow(projY,2));
// distancia desde A al punto proyectado (en metros) - estimada con haversine
const distAlong = this.haversineDistance(A, closest);
return { closest, t, distToSeg, distAlong };
  }
// Dado un array de coords [[lat,lng],[lat,lng],...], y un punto P, calcula el punto proyectado
// devuelte { point: [lat,lon], distanceFromStartMeters, segmentIndex, distToSegmentMeters, totalRouteLengthMeters }
private computeNearestPointOnPolyline(coords: [number,number][], P: [number,number]) {
let best = {
      distanceFromStart: Infinity,
      point: coords[0] as [number,number],
      segmentIndex: 0,
      distToSegment: Infinity
    };
// precalc segment lengths
const segLens: number[] = [];
for (let i=0;i<coords.length-1;i++){
      segLens[i] = this.haversineDistance(coords[i], coords[i+1]);
    }
const totalRouteLength = segLens.reduce((a,b)=>a+b,0);
let accumulated = 0;
for (let i=0;i<coords.length-1;i++){
const A = coords[i];
const B = coords[i+1];
const proj = this.projectPointOnSegment(P, A, B);
const distFromStart = accumulated + proj.distAlong;
if (proj.distToSeg < best.distToSegment) {
        best = {
          distanceFromStart: distFromStart,
          point: proj.closest,
          segmentIndex: i,
          distToSegment: proj.distToSeg
        };
      }
      accumulated += segLens[i];
    }
return {
      point: best.point,
      distanceFromStartMeters: best.distanceFromStart,
      segmentIndex: best.segmentIndex,
      distToSegmentMeters: best.distToSegment,
      totalRouteLengthMeters: totalRouteLength
    };
  }
// --- ADICION: función para construir sub-array de coords hasta un punto proyectado
private buildPathUpToPoint(coords: [number,number][], segmentIndex: number, projectedPoint: [number,number]) {
const path: [number,number][] = [];
for (let i=0;i<=segmentIndex;i++){
      path.push(coords[i]);
    }
    path.push(projectedPoint);
return path;
  }
// --- ADICION: setear visual de ruta activa y desvanecer otras rutas/calles
private setActiveRouteVisual(activeApiId: string|null) {
this.activeRouteId = activeApiId;
if (activeApiId === null) {
// Restaurar estilos originales para todas las rutas
      Object.keys(this.rutasPolylines).forEach(key => {
const arr = this.rutasPolylines[key];
        arr.forEach(poly => {
          poly.setStyle({ color: '#00cc44', weight: 5, opacity: 0.95 });
        });
      });
    } else {
// Disminuir opacidad de no activas
      Object.keys(this.rutasPolylines).forEach(key => {
const arr = this.rutasPolylines[key];
        arr.forEach(poly => {
if (key === activeApiId) {
            poly.setStyle({ opacity: 1, weight: 6, color: '#ff3333' });
          } else {
            poly.setStyle({ opacity: 0.15, weight: 3, color: '#5a7ba6' });
          }
        });
      });
    }
// Calles: transparentar cuando hay ruta activa
if (this.callesLayer) {
this.callesLayer.eachLayer((l: any) => {
try {
          (l as L.Polyline).setStyle({ opacity: activeApiId ? 0.05 : 0.9 });
        } catch(e) {}
      });
    }
  }
// --- ADICION: calcular bearing (dirección) entre dos puntos
private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
const toRad = (deg: number) => deg * Math.PI / 180;
const toDeg = (rad: number) => rad * 180 / Math.PI;
const dLon = toRad(lon2 - lon1);
const y = Math.sin(dLon) * Math.cos(toRad(lat2));
const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
let brng = toDeg(Math.atan2(y, x));
    brng = (brng + 360) % 360;
return brng;
  }
// --- ADICION: manejar actualizacion de posicion (llamada por watchPosition)
private async handlePositionUpdate(position: any) {
try {
let lat = position.coords.latitude;
let lng = position.coords.longitude;
console.log('Posición en ruta:', { lat, lng, accuracy: position.coords.accuracy });
const now = Date.now();
const deltaT = (now - this.lastUpdateTime) / 1000;
// Filtrar outliers basados en velocidad máxima
if (this.lastPosition && deltaT > 0) {
const dist = this.haversineDistance([this.lastPosition.lat, this.lastPosition.lng], [lat, lng]);
if (dist / deltaT > this.MAX_SPEED_MS) {
          console.warn('Posición outlier detectada, ignorando');
return;
        }
      }
// Suavizado con promedio móvil
this.positionBuffer.push({ lat, lng });
if (this.positionBuffer.length > this.BUFFER_SIZE) this.positionBuffer.shift();
const avgLat = this.positionBuffer.reduce((sum, p) => sum + p.lat, 0) / this.positionBuffer.length;
const avgLng = this.positionBuffer.reduce((sum, p) => sum + p.lng, 0) / this.positionBuffer.length;
// Calcular dirección si hay posición anterior
if (this.lastPosition) {
this.heading = this.calculateBearing(this.lastPosition.lat, this.lastPosition.lng, avgLat, avgLng);
      }
this.lastPosition = { lat: avgLat, lng: avgLng };
this.lastUpdateTime = now;
this.currentPosition = { lat: avgLat, lng: avgLng };
// actualizar marker conductor
this.setUserMarker(avgLat, avgLng, '🚗 Tú', false); // No centrar automáticamente
if (!this.selectedRuta) return; // nada que comparar
// obtener coordenadas de la ruta (un solo array continuo)
const rawShape = this.selectedRuta.shape;
// puede ser string JSON o objeto; normalizamos a array de [lat,lng]
let coords: [number,number][] = [];
try {
const shapeObj = typeof rawShape === 'string' ? JSON.parse(rawShape) : rawShape;
if (shapeObj.type === 'LineString') {
          coords = shapeObj.coordinates.map((c: any) => [c[1], c[0]]);
        } else if (shapeObj.type === 'MultiLineString') {
// aplanar todos los segmentos en uno solo (mejorable si quieres múltiples partes)
          coords = shapeObj.coordinates.flat().map((c: any) => [c[1], c[0]]);
        }
      } catch(e) {
        console.warn('Error parseando shape:', e);
return;
      }
if (coords.length < 2) return;
const P: [number,number] = [avgLat, avgLng];
const nearest = this.computeNearestPointOnPolyline(coords, P);
// Verificar si está off-route
if (nearest.distToSegmentMeters > this.offRouteThreshold) {
await this.notify('¡Atención!', 'Estás fuera de la ruta. Corrige tu trayectoria.');
      }
// progress
const distFromStart = nearest.distanceFromStartMeters;
const total = nearest.totalRouteLengthMeters;
const percent = total > 0 ? Math.min(100, Math.max(0, (distFromStart/total)*100)) : 0;
this.routeProgress = { distanceMeters: Math.round(distFromStart), percent: Math.round(percent) };
// actualizar o crear polyline travelled/remaining
const travelledCoords = this.buildPathUpToPoint(coords, nearest.segmentIndex, nearest.point);
const remainingCoords = [nearest.point, ...coords.slice(nearest.segmentIndex+1)];
// reemplazar travelledLine y remainingLine en el mapa
if (this.travelledLine) this.recorridoLayer.removeLayer(this.travelledLine);
if (this.remainingLine) this.recorridoLayer.removeLayer(this.remainingLine);
this.travelledLine = L.polyline(travelledCoords as any, { color: '#0000FF', weight: 6, opacity: 0.9 }).addTo(this.recorridoLayer);
this.remainingLine = L.polyline(remainingCoords as any, { color: '#ff3333', weight: 6, opacity: 0.5, dashArray: '6,8' }).addTo(this.recorridoLayer);
// Opcional: mover el marker del conductor al punto proyectado (si quieres "snap")
if (this.markerConductor) {
this.markerConductor.setLatLng(nearest.point);
this.markerConductor.setRotationAngle(this.heading);
      } else {
this.markerConductor = L.marker(nearest.point, {
          icon: L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61155.png', iconSize: [28,28], iconAnchor: [14,28] }),
          rotationAngle: this.heading
        }).addTo(this.recorridoLayer);
      }
// Eliminado el panTo automático para permitir navegación libre
// log
// console.log('Progress', this.routeProgress, 'distToSeg', nearest.distToSegmentMeters);
    } catch (e) {
      console.error('Error handlePositionUpdate:', e);
    }
  }
// --- ADICION: iniciar seguimiento GPS real (llamar desde iniciarRecorrido)
private async startRouteTracking() {
// primero seteamos visual de ruta activa
if (!this.selectedRuta) {
      console.warn('startRouteTracking: no hay ruta seleccionada');
return;
    }
const routeKey = this.selectedRuta.api_id ?? String(this.selectedRuta.id);
this.setActiveRouteVisual(routeKey);
// obtener posicion inicial antes de empezar watch (mejor UX)
try {
const allowed = await this.requestLocationPermission();
if (!allowed) {
alert('Permiso de ubicación denegado');
return;
      }
    } catch (e) {
      console.warn('requestPermissions error', e);
    }
try {
const pos: any = await this.getCurrentPositionWrapper({ enableHighAccuracy: true, timeout: 15000 });
// posicion inicial
await this.handlePositionUpdate({ coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } });
// watch
const id = await this.watchPositionWrapper(
        (position) => {
if (position && position.coords) {
this.handlePositionUpdate(position);
          }
        },
        (err) => {
console.error('Geolocation watch error', err);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
this.watchPositionId = id;
    } catch (e) {
console.error('startRouteTracking error', e);
    }
  }
// --- ADICION: detener tracking (llamar al finalizar recorrido)
private stopRouteTracking() {
// limpiar watch de ruta
this.clearWatchGeneric(this.watchPositionId);
this.watchPositionId = null;
// limpiar lineas de recorrido del mapa
if (this.travelledLine) { this.recorridoLayer.removeLayer(this.travelledLine); this.travelledLine = null; }
if (this.remainingLine) { this.recorridoLayer.removeLayer(this.remainingLine); this.remainingLine = null; }
if (this.markerConductor) { this.recorridoLayer.removeLayer(this.markerConductor); this.markerConductor = null; }
// restaurar visuales
this.setActiveRouteVisual(null);
this.routeProgress = { distanceMeters: 0, percent: 0 };
// Reset buffer y heading
this.positionBuffer = [];
this.heading = 0;
this.lastPosition = null;
this.lastUpdateTime = 0;
  }
// -----------------------
// NUEVAS FUNCIONES: manejo de usuario/vehículo
// -----------------------
private loadUser() {
const token = localStorage.getItem('token') || '';
if (!token) return;
// intentamos cargar usuario vía servicio
this.userService.getUser(token).subscribe({
next: (res) => {
console.log('Usuario cargado en Tab1:', res);
this.user = res;
// además guardamos en localStorage por si otra parte espera ese valor
try {
localStorage.setItem('user', JSON.stringify(res));
// si viene vehiculo_id sencillo, lo guardamos también
if (res?.vehiculo_id) localStorage.setItem('vehiculo_id', res.vehiculo_id);
        } catch (e) {}
      },
error: (err) => {
console.warn('No se pudo cargar usuario en Tab1:', err);
// fallback: intentar leer user desde localStorage si existe
try {
const raw = localStorage.getItem('user');
if (raw) this.user = JSON.parse(raw);
        } catch (e) {}
      }
    });
  }
/**
   * Intenta obtener el vehiculo asignado al usuario en varias fuentes.
   * Orden:
   * - this.user.vehiculo.api_id || this.user.vehiculo.id
   * - this.user.vehiculo_id
   * - localStorage.getItem('vehiculo_id')
   * - fallback hardcodeado (se usa como último recurso)
   */
private getAssignedVehicleId(): string | null {
try {
// primer intento: objeto vehiculo dentro de user (posible estructura: user.vehiculo.api_id)
if (this.user) {
if (this.user.vehiculo) {
// puede tener api_id o id
if (this.user.vehiculo.api_id) return this.user.vehiculo.api_id;
if (this.user.vehiculo.id) return this.user.vehiculo.id;
        }
if (this.user.vehiculo_id) return this.user.vehiculo_id;
      }
// segundo intento: localStorage
const fromLs = localStorage.getItem('vehiculo_id');
if (fromLs) return fromLs;
    } catch (e) {
console.warn('getAssignedVehicleId error:', e);
    }
// fallback: mantener tu id hardcodeado para compatibilidad (pero avisamos)
const fallback = '0199d01b-d17c-736f-9ab7-4a045d22cb94';
console.warn('No se encontró vehiculo asignado; usando fallback hardcodeado. Recomendado: asignar vehiculo al usuario o guardar vehiculo_id en localStorage.');
return fallback;
  }
}