import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { FederatedLoginComponent } from './federated-login/federated-login.component';

@NgModule({
    imports: [
        AuthRoutingModule,
        CommonModule,
        FederatedLoginComponent,
        FontAwesomeModule,
        ForgotPasswordComponent,
        FormsModule,
        LoginComponent,
        ReactiveFormsModule,
        ResetPasswordComponent,
        SignupComponent,
    ],
})
export class AuthModule {}
