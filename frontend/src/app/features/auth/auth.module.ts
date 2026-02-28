import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReactiveFormsModule} from '@angular/forms';
import {RouterModule} from '@angular/router';
import {AuthRoutingModule} from './auth-routing.module';
import {LoginPageComponent} from './pages/login-page/login-page.component';
import {RegisterPageComponent} from './pages/register-page/register-page.component';
import {ForgotPasswordPageComponent} from './pages/forgot-password-page/forgot-password-page.component';
import {ResetPasswordPageComponent} from './pages/reset-password-page/reset-password-page.component';
import {ChangePasswordPageComponent} from './pages/change-password-page/change-password-page.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    AuthRoutingModule,
    LoginPageComponent,
    RegisterPageComponent,
    ForgotPasswordPageComponent,
    ResetPasswordPageComponent,
    ChangePasswordPageComponent,
  ],
})
export class AuthModule {}
