import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { unauthGuardCanActivate } from '../../_guards/unauth.guard';
import { SignupComponent } from './signup/signup.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { tokenGuardCanActivate } from '../../_guards/token.guard';

const routes: Routes = [
    {
        path: '',
        children: [
            // Unauthenticated only
            {path: 'forgotPassword', component: ForgotPasswordComponent, canActivate: [unauthGuardCanActivate]},
            {path: 'login',          component: LoginComponent,          canActivate: [unauthGuardCanActivate]},
            {path: 'signup',         component: SignupComponent,         canActivate: [unauthGuardCanActivate]},

            // Authenticated by token
            {path: 'resetPassword',  component: ResetPasswordComponent,  canActivate: [tokenGuardCanActivate]},
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule {}
