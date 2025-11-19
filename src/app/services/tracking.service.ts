import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {

  recorridoActivo: any = null;
  intervalo: any = null;
  currentPosition: any = null;

  constructor() {
    // Recupera recorrido activo al iniciar app
    const saved = localStorage.getItem('activeRecorridoId');
    if (saved) {
      this.recorridoActivo = { id: saved };
    }
  }

  setRecorridoActivo(recorrido: any) {
    this.recorridoActivo = recorrido;
    localStorage.setItem('activeRecorridoId', recorrido.id);
  }

  clearRecorrido() {
    this.recorridoActivo = null;
    localStorage.removeItem('activeRecorridoId');

    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = null;
  }

iniciarEnvioPosiciones(callbackEnviarPos: () => void) {
  if (this.intervalo) clearInterval(this.intervalo);

  this.intervalo = setInterval(() => {
    callbackEnviarPos();
  }, 10000);
}

}
