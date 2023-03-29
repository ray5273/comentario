import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { unauthGuardCanActivate } from '../../_guards/unauth.guard';
import { SignupComponent } from './signup/signup.component';

const routes: Routes = [
    {
        path: '',
        children: [
            // Unauthenticated only
            {path: 'login',  component: LoginComponent,  canActivate: [unauthGuardCanActivate]},
            {path: 'signup', component: SignupComponent, canActivate: [unauthGuardCanActivate]},
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule {}
