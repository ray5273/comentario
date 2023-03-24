import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuardCanActivate } from '../../_guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ControlCenterComponent } from './control-center/control-center.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';

const children: Routes = [
    // Default route
    {path: '', pathMatch: 'full', redirectTo: 'dashboard'},

    // Dashboard
    {path: 'dashboard', component: DashboardComponent},

    // Domains
    {path: 'domains', component: DomainManagerComponent},
];

// Make a parent route object, protected by the AuthGuard
const routes: Routes = [{
    path:                  '',
    component:             ControlCenterComponent,
    canActivate:           [authGuardCanActivate],
    runGuardsAndResolvers: 'always', // Auth status can change over time, without a change in route or params
    children,
}];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ManageRoutingModule {}
