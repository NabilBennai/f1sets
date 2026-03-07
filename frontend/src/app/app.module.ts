import {NgModule} from '@angular/core';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {BrowserModule} from '@angular/platform-browser';
import {TranslateModule} from '@ngx-translate/core';
import {provideTranslateHttpLoader} from '@ngx-translate/http-loader';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {authInterceptor} from './features/auth/data-access/auth.interceptor';
import {NavbarComponent} from './shared/components/navbar/navbar.component';
import {ToastViewportComponent} from './core/toast/toast-viewport.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    NavbarComponent,
    ToastViewportComponent,
    AppRoutingModule,
    TranslateModule.forRoot(),
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    ...provideTranslateHttpLoader({
      prefix: '/i18n/',
      suffix: '.json',
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
