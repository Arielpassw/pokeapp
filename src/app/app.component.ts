import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private readonly platform: Platform) {}

  async ngOnInit() {
    await this.initializeApp();
  }

  private async initializeApp() {
    await this.platform.ready();
    // Ocultar el Splash Screen una vez que la plataforma y la UI estén listas
    await SplashScreen.hide();
  }
}
