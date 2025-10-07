import { Injectable } from '@angular/core';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Storage } from '@ionic/storage-angular';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  private externalBase = environment.urlserverlucio;
  private localBase = environment.miurlserve;
  private storageKeyCalles = 'cache_calles';
  private storageKeyVehiculos = 'cache_vehiculos';

  constructor(private storage: Storage) {
    this.init();
  }

  private async init() {
    const s = await this.storage.create();
    this.storage = s;
  }

  private async httpGet(url: string, headers: any = {}): Promise<HttpResponse> {
    return await CapacitorHttp.get({
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }

  async fetchCalles(page = 1): Promise<any> {
    try {
      const res = await this.httpGet(`${this.externalBase}calles?page=${page}`);
      const payload = res.data;
      if (page === 1) await this.storage.set(this.storageKeyCalles, payload.data ?? payload);
      return payload;
    } catch (err) {
      console.warn('External calles failed, fetching local', err);
      const localRes = await this.httpGet(`${this.localBase}/calles?page=${page}`);
      const payload = localRes.data;
      if (page === 1) await this.storage.set(this.storageKeyCalles, payload.data ?? payload);
      return payload;
    }
  }

  async fetchVehiculosExtern(perfilId?: string, page = 1): Promise<any> {
    try {
      const url = perfilId
        ? `${this.externalBase}vehiculos?perfil_id=${encodeURIComponent(perfilId)}&page=${page}`
        : `${this.externalBase}vehiculos?page=${page}`;
      const res = await this.httpGet(url);
      return res.data;
    } catch (err) {
      console.warn('External vehiculos failed', err);
      const localRes = await this.httpGet(`${this.localBase}/vehiculos?perfil_id=${perfilId}&page=${page}`);
      return localRes.data;
    }
  }

  async fetchVehiculoLocal(userId: number, token?: string): Promise<any> {
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await this.httpGet(`${this.localBase}/vehiculos/usuario/${userId}`, headers);
      return res.data;
    } catch (err) {
      console.warn('fetchVehiculoLocal fallo', err);
      throw err;
    }
  }

}
