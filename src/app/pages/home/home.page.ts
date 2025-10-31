import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonicModule, CommonModule, RouterModule],
})
export class HomePage {
  menuVisible = false;

  toggleMenu() {
    const menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('-translate-x-full');
  }
}
