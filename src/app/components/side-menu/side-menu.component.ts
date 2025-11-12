import { Component, OnInit, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonItem, 
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
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonCard, 
  IonProgressBar,
  IonButtons, 
  IonText, 
  IonLabel } from '@ionic/angular/standalone';
import { MenuController } from '@ionic/angular';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Router } from '@angular/router';
@Component({
selector: 'app-side-menu',
templateUrl: './side-menu.component.html',
styleUrls: ['./side-menu.component.scss'],
standalone: true,
  imports: [
CommonModule,
IonMenuButton,
IonButtons,
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
IonLabel,
IonApp,
IonMenu,
IonList,
IonItem,
IonIcon
  ]
})
export class SideMenuComponent implements OnInit, AfterViewInit, OnDestroy {
     @Input() contentId = 'main-content'; // ✅ Valor por defecto

  user: any = null; // 👈 declaramos la propiedad

constructor(private menuCtrl: MenuController, private router: Router) {}

  ngOnInit(): void {
    // Cargar el usuario desde localStorage si existe
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }
ngAfterViewInit(): void {}
ngOnDestroy(): void {}


  
  // ===================== MENÚ LATERAL =====================
  irPerfil() {
    console.log('Ir al perfil');
    this.router.navigate(['/tabs/tab3']);
  }


irMapa(){
  console.log ('Ir al mapa');
  this.router.navigate (['/tabs/tab1']);
}

irRecorridos(){
  console.log ('Ir a recorridos');
  this.router.navigate (['/tabs/tab2']);
} 


async navegarYcerrar(ruta: string) {
  const MENU_ID = 'main-menu';
  let targetUrl = '/tabs/tab1'; // 👈 variable definida fuera del try/catch

  try {
    // Determinar la URL según la opción
    if (ruta === 'recorridos') targetUrl = '/tabs/tab2';
    else if (ruta === 'perfil') targetUrl = '/tabs/tab3';

    // 1️⃣ Cierra el menú correctamente antes de navegar
    await this.menuCtrl.close(MENU_ID);

    // 2️⃣ Espera un instante para completar la animación
    await new Promise(resolve => setTimeout(resolve, 200));

    // 3️⃣ Navega al destino
    await this.router.navigateByUrl(targetUrl, { replaceUrl: true });

    // 4️⃣ Cierra de nuevo el menú por seguridad (por si se quedó abierto)
    await this.menuCtrl.close(MENU_ID);

    // 5️⃣ Limpieza visual del backdrop (por si quedó colgado)
    setTimeout(() => {
      const backdrop = document.querySelector('ion-backdrop');
      if (backdrop) (backdrop as HTMLElement).style.display = 'none';
    }, 300);

  } catch (err) {
    console.error('Error en navegarYcerrar:', err);

    // Cierre de respaldo y navegación segura
    await this.menuCtrl.close(MENU_ID).catch(() => {});
    this.router.navigateByUrl(targetUrl, { replaceUrl: true }).catch(() => {});
  }
}




  // 🔹 Cerrar sesión
  async cerrarSesion() {
    // Limpia token o datos guardados
    localStorage.removeItem('token');

    // Cierra el menú
    await this.menuCtrl.close();

    // Redirige al login o pantalla inicial
    this.router.navigate(['/login']);
  }

}