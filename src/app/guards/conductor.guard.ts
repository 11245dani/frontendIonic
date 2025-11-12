import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class ConductorGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role?.nombre === 'conductor') {
        return true;
      }
    }

    // ❌ Si no es conductor, redirigir
    this.router.navigate(['/login']);
    return false;
  }
}
