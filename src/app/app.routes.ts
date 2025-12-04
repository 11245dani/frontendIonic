import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
    {
  path: 'crear-cuenta',
  loadComponent: () =>
    import('./pages/crear-cuenta/crear-cuenta.page').then(m => m.CrearCuentaPage)
},
  {
    path: 'tabs',
    loadChildren: () =>
      import('./tabs/tabs.routes').then((m) => m.routes),
  },
{
  path: 'ciudadano-home',
  loadChildren: () =>
    import('./pages/ciudadano-home/ciudadano-home.routes').then(
      (m) => m.routes
    ),
},

  {
    path: '**',
    redirectTo: 'home',
  },
];


