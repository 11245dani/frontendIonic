import { Injectable } from '@angular/core';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Storage } from '@ionic/storage-angular';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  private externalBase = environment.urlserverlucio;
  private localBase = environment.miurlserve;
  private storageKeyCalles = 'cache_calles';

 constructor(private storage: Storage) {
  this.init();
  console.log('DataService init - externalBase:', this.externalBase);
  console.log('DataService init - localBase:', this.localBase);
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


}
