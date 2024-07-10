import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { AuthGuard } from '../../_guards/auth.guard';

const routes: Routes = [
    {
        path: '',
        children: [
            // Unauthenticated only
            {path: 'forgotPassword', component: ForgotPasswordComponent, canActivate: [AuthGuard.isUnauthenticated]},
            {path: 'login',          component: LoginComponent,          canActivate: [AuthGuard.isUnauthenticated]},
            {path: 'signup',         component: SignupComponent,         canActivate: [AuthGuard.isUnauthenticated]},

            // Authenticated by token
            {path: 'resetPassword',  component: ResetPasswordComponent,  canActivate: [AuthGuard.hasTokenInNavigation]},
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule {}
