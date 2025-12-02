// main.ts - solo para depuración
window.addEventListener('unhandledrejection', event => {
  console.error('PROMISE ERROR:', event.reason);
});
window.addEventListener('error', event => {
  console.error('ERROR GLOBAL:', event.error);
  console.error('Archivo:', event.filename);
  console.error('Línea:', event.lineno);
  console.error('Columna:', event.colno);
  console.error('Stack:', event.error?.stack);
});



import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { IonicStorageModule, Storage } from '@ionic/storage-angular';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { Keyboard, type KeyboardResize } from '@capacitor/keyboard';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// 👉 FIX DEL TECLADO
Keyboard.setResizeMode({ mode: 'native' as KeyboardResize });

addIcons({
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(),

    importProvidersFrom(
      IonicStorageModule.forRoot({
        name: '__mydb',
        driverOrder: ['indexeddb', 'sqlite', 'websql']
      })
    ),

    Storage,

    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
