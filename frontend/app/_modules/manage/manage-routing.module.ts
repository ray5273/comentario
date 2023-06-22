import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuardCanActivate } from '../../_guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ControlCenterComponent } from './control-center/control-center.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropertiesComponent } from './domains/domain-properties/domain-properties.component';
import { CommentManagerComponent } from './comments/comment-manager/comment-manager.component';
import { UserManagerComponent } from './users/user-manager/user-manager.component';
import { DomainStatsComponent } from './domain-stats/domain-stats.component';
import { DomainOperationsComponent } from './domain-operations/domain-operations.component';

const children: Routes = [
    // Default route
    {path: '', pathMatch: 'full', redirectTo: 'dashboard'},

    // Dashboard
    {path: 'dashboard', component: DashboardComponent},

    // Domains
    {path: 'domains',            component: DomainManagerComponent},
    {path: 'domains/create',     component: DomainEditComponent, data: {new: true}},
    {path: 'domains/:id',        component: DomainPropertiesComponent},
    {path: 'domains/:id/edit',   component: DomainEditComponent},
    {path: 'domains/:id/clone',  component: DomainEditComponent, data: {new: true}},
    {path: 'domains/:id/import', component: DomainImportComponent},

    // Comments
    {path: 'comments', component: CommentManagerComponent},

    // Users
    {path: 'users', component: UserManagerComponent},

    // Stats
    {path: 'stats', component: DomainStatsComponent}, // TODO add DomainSelectedGuard

    // Operations
    {path: 'operations', component: DomainOperationsComponent}, // TODO add DomainSelectedGuard

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
