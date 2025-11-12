import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class CiudadanoGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const userData = localStorage.getItem('user');

    if (!userData) {
      this.router.navigate(['/login']);
      return false;
    }

    const user = JSON.parse(userData);

    // ✅ Verifica el nombre del rol en cualquiera de los formatos posibles
    const roleName = user.role?.nombre || user.rol?.nombre;

    if (roleName !== 'ciudadano') {
      // Si no es ciudadano, redirige al conductor
      this.router.navigate(['/tabs/tab1']);
      return false;
    }

    return true;
  }
}
