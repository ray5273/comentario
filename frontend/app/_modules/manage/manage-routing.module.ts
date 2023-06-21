import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuardCanActivate } from '../../_guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ControlCenterComponent } from './control-center/control-center.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropertiesComponent } from './domains/domain-detail/domain-properties/domain-properties.component';
import { DomainModeratorsComponent } from './domains/domain-detail/domain-moderators/domain-moderators.component';
import { DomainStatsComponent } from './domains/domain-detail/domain-stats/domain-stats.component';
import { DomainImpexComponent } from './domains/domain-detail/domain-impex/domain-impex.component';
import { DomainDangerZoneComponent } from './domains/domain-detail/domain-danger-zone/domain-danger-zone.component';

const children: Routes = [
    // Default route
    {path: '', pathMatch: 'full', redirectTo: 'dashboard'},

    // Dashboard
    {path: 'dashboard', component: DashboardComponent},

    // Domains
    {path: 'domains',              component: DomainManagerComponent},
    {path: 'domains/create',       component: DomainEditComponent, data: {new: true}},
    {
        path: 'domains/:id',
        component: DomainDetailComponent,
        children: [
            {path: '', pathMatch: 'full', redirectTo: 'settings'},
            {path: 'settings',     component: DomainPropertiesComponent},
            {path: 'moderators',   component: DomainModeratorsComponent},
            {path: 'stats',        component: DomainStatsComponent},
            {path: 'impex',        component: DomainImpexComponent},
            {path: 'danger',       component: DomainDangerZoneComponent},
        ],
    },
    {path: 'domains/:id/edit',   component: DomainEditComponent},
    {path: 'domains/:id/clone',  component: DomainEditComponent, data: {new: true}},
    {path: 'domains/:id/import', component: DomainImportComponent},

    // Account
    {path: 'account/profile', component: ProfileComponent},
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
