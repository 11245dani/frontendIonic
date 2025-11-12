import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ciudadano-home',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './ciudadano-home.page.html',
  styleUrls: ['./ciudadano-home.page.scss'],
})
export class CiudadanoHomePage implements OnInit {
  user: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.user = JSON.parse(userData);
    }
  }

  irPerfil() {
    // 🔗 Redirige al tab3
    this.router.navigateByUrl('/tabs/tab3');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
