import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { unauthGuardCanActivate } from '../../_guards/unauth.guard';

const routes: Routes = [
    {
        path: '',
        children: [
            // Unauthenticated only
            {path: 'login', component: LoginComponent, canActivate: [unauthGuardCanActivate]},
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AuthRoutingModule {}
