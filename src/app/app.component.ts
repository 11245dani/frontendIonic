import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { SideMenuComponent } from './components/side-menu/side-menu.component'; // 👈 importa tu menú lateral

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet,
    SideMenuComponent // 👈 registra el menú aquí
  ],
})
export class AppComponent {
  constructor() {}
}
