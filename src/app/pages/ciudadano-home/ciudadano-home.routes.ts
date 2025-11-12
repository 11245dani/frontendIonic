import { Routes } from '@angular/router';
import { CiudadanoGuard } from '../../guards/ciudadano.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ciudadano-home.page').then((m) => m.CiudadanoHomePage),
    canActivate: [CiudadanoGuard],
  },
];
