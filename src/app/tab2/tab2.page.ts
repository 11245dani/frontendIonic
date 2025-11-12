import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MenuController, AlertController, ToastController } from '@ionic/angular';
import {
  IonItem,
  IonIcon,
  IonMenuButton,
  IonList,
  IonApp,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonText,
  IonLabel,
  IonFooter,
  IonSearchbar
} from '@ionic/angular/standalone';
import { SideMenuComponent } from '../components/side-menu/side-menu.component';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeCircleOutline, chevronDownOutline } from 'ionicons/icons';
import { environment } from 'src/environments/environment';

addIcons({
  'close-circle-outline': closeCircleOutline,
  'chevron-down-outline': chevronDownOutline
});

@Component({
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonMenuButton,
    IonButtons,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonIcon,
    IonText,
    IonLabel,
    IonApp,
    IonMenu,
    IonFooter,
    IonSearchbar,
    SideMenuComponent
  ],
})
export class Tab2Page implements OnInit, OnDestroy {
  recorridos: any[] = [];
  recorridosFiltrados: any[] = [];
  searchTerm: string = '';
  filtroFecha: string | null = null;
  filtroHora: string | null = null;
  filtroDia: string | null = null;
  refrescoInterval: any;

  constructor(
    private http: HttpClient,
    private menuCtrl: MenuController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
      addIcons({closeCircleOutline,chevronDownOutline});}

  ngOnInit() {
    // 🔁 Carga inicial
    this.cargarRecorridos(true);

    // 🔁 Refrescamos recorridos cada 10 segundos
    this.refrescoInterval = setInterval(() => {
      this.ngZone.run(() => this.cargarRecorridos(false));
    }, 10000);
  }

  ngOnDestroy() {
    if (this.refrescoInterval) clearInterval(this.refrescoInterval);
  }

  // 📦 Cargar recorridos desde API
  async cargarRecorridos(showLog = false) {
    const token = localStorage.getItem('token');
    let perfil_id = localStorage.getItem('perfil_id') || environment.perfil_id;

    if (!token || !perfil_id) {
      this.mostrarToast('⚠️ No hay token o perfil_id disponible. Inicia sesión nuevamente.');
      console.warn('⚠️ Falta token o perfil_id');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http
      .get(`http://127.0.0.1:8000/api/misrecorridos?perfil_id=${perfil_id}`, { headers })
      .subscribe({
        next: (res: any) => {
          let nuevos = res.recorridos ?? [];

          // 🕒 Ordenar por fecha (más nuevos primero)
          nuevos.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          // ✅ Detectar si hay cambios
          const huboCambios = JSON.stringify(nuevos) !== JSON.stringify(this.recorridos);
          this.recorridos = nuevos;
          this.aplicarFiltros();

          // 🚗 Detectar recorrido en curso
          const enCurso = this.recorridos.find((r) => r.estado?.toLowerCase() === 'en curso');
          if (enCurso) {
            console.log('🚗 Hay un recorrido en curso:', enCurso.ruta?.nombre);
          }

          if (huboCambios && showLog) {
            console.log('🔁 Recorridos actualizados en tiempo real.');
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error al cargar recorridos:', err);
          this.mostrarToast('❌ No se pudieron cargar los recorridos.');
        },
      });
  }

  // 🔍 Filtros de búsqueda
  filtrarRecorridos() {
    this.aplicarFiltros();
  }

  onInputChange(event: any) {
    const value = event.detail.value?.trim().toLowerCase() || '';
    if (value.length === 0) this.aplicarFiltros();
  }

  // 📅 Selectores de filtros
  async abrirCalendario() {
    const alert = await this.alertCtrl.create({
      header: 'Seleccionar fecha',
      inputs: [{ type: 'date', name: 'fecha', value: this.filtroFecha || '' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: (data) => {
            this.filtroFecha = data.fecha || null;
            this.aplicarFiltros();
          },
        },
      ],
    });
    await alert.present();
  }

  async abrirHora() {
    const alert = await this.alertCtrl.create({
      header: 'Seleccionar hora',
      inputs: [{ type: 'time', name: 'hora', value: this.filtroHora || '' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: (data) => {
            this.filtroHora = data.hora || null;
            this.aplicarFiltros();
          },
        },
      ],
    });
    await alert.present();
  }

  async abrirDia() {
    const alert = await this.alertCtrl.create({
      header: 'Seleccionar día',
      inputs: [
        { label: 'Lunes', type: 'radio', value: 'lunes' },
        { label: 'Martes', type: 'radio', value: 'martes' },
        { label: 'Miércoles', type: 'radio', value: 'miércoles' },
        { label: 'Jueves', type: 'radio', value: 'jueves' },
        { label: 'Viernes', type: 'radio', value: 'viernes' },
        { label: 'Sábado', type: 'radio', value: 'sábado' },
        { label: 'Domingo', type: 'radio', value: 'domingo' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Aceptar',
          handler: (data) => {
            this.filtroDia = data || null;
            this.aplicarFiltros();
          },
        },
      ],
    });
    await alert.present();
  }

  limpiarFiltro(event: Event, tipo: 'fecha' | 'hora' | 'dia') {
    event.stopPropagation();
    if (tipo === 'fecha') this.filtroFecha = null;
    if (tipo === 'hora') this.filtroHora = null;
    if (tipo === 'dia') this.filtroDia = null;
    this.aplicarFiltros();
  }

  // 🧩 Aplicar filtros
  aplicarFiltros() {
    const term = this.searchTerm.trim().toLowerCase();

    this.recorridosFiltrados = this.recorridos.filter((r) => {
      const nombreRuta = r.ruta?.nombre?.toLowerCase() || '';
      const fecha = new Date(r.created_at);
      const diaSemana = fecha
        .toLocaleDateString('es-ES', { weekday: 'long' })
        .toLowerCase();
      const hora = fecha.toTimeString().slice(0, 5);
      const fechaStr = fecha.toISOString().split('T')[0];

      const coincideBusqueda = !term || nombreRuta.includes(term);
      const coincideFecha = !this.filtroFecha || fechaStr === this.filtroFecha;
      const coincideHora = !this.filtroHora || hora.startsWith(this.filtroHora);
      const coincideDia = !this.filtroDia || diaSemana === this.filtroDia;

      return coincideBusqueda && coincideFecha && coincideHora && coincideDia;
    });
  }

  // 🧾 Mostrar toast
  private async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom',
      color: 'warning',
    });
    toast.present();
  }
}
