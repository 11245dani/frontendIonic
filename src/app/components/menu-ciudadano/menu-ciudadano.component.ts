import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';

import {
  IonMenu, IonContent, IonList, IonItem, IonIcon, IonButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-menu-ciudadano',
  templateUrl: './menu-ciudadano.component.html',
  styleUrls: ['./menu-ciudadano.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonButton,
    IonIcon
  ]
})
export class MenuCiudadanoComponent implements OnInit {

  @Input() contentId = 'main-content';

  user: any = null;

  constructor(private menuCtrl: MenuController, private router: Router) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) this.user = JSON.parse(userData);
  }

  async navegarYcerrar(ruta: string) {
    const MENU_ID = 'menu-ciudadano';
    let targetUrl = '/ciudadano/perfil';

    if (ruta === 'reportes') targetUrl = '/ciudadano/reportar';
    if (ruta === 'rutas') targetUrl = '/ciudadano/rutas';

    await this.menuCtrl.close(MENU_ID);
    await new Promise(res => setTimeout(res, 150));

    this.router.navigateByUrl(targetUrl).catch(err => console.error(err));
  }

  async cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await this.menuCtrl.close('menu-ciudadano');
    this.router.navigate(['/login']);
  }
}
