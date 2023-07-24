import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../_guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ControlCenterComponent } from './control-center/control-center.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropertiesComponent } from './domains/domain-properties/domain-properties.component';
import { CommentManagerComponent } from './comments/comment-manager/comment-manager.component';
import { UserManagerComponent } from './users/user-manager/user-manager.component';
import { StatsComponent } from './stats/stats.component';
import { DomainOperationsComponent } from './domain-operations/domain-operations.component';
import { ManageGuard } from './_guards/manage.guard';
import { PageManagerComponent } from './pages/page-manager/page-manager.component';
import { PagePropertiesComponent } from './pages/page-properties/page-properties.component';
import { UserPropertiesComponent } from './users/user-properties/user-properties.component';
import { UserEditComponent } from './users/user-edit/user-edit.component';

const children: Routes = [
    // Default route
    {path: '', pathMatch: 'full', redirectTo: 'dashboard'},

    // Dashboard
    {path: 'dashboard',          component: DashboardComponent},

    // Domains
    {path: 'domains',            component: DomainManagerComponent},
    {path: 'domains/create',     component: DomainEditComponent, data: {new: true}},
    {path: 'domains/:id',        component: DomainPropertiesComponent},
    {path: 'domains/:id/edit',   component: DomainEditComponent,       canActivate: [ManageGuard.canManageDomain]},
    {path: 'domains/:id/clone',  component: DomainEditComponent,       canActivate: [ManageGuard.canManageDomain], data: {new: true}},
    {path: 'domains/:id/import', component: DomainImportComponent,     canActivate: [ManageGuard.canManageDomain]},

    // Pages
    {path: 'pages',              component: PageManagerComponent,      canActivate: [ManageGuard.isDomainSelected]},
    {path: 'pages/:id',          component: PagePropertiesComponent,   canActivate: [ManageGuard.isDomainSelected]},

    // Comments
    {path: 'comments',           component: CommentManagerComponent,   canActivate: [ManageGuard.isDomainSelected]},

    // Stats
    {path: 'stats',              component: StatsComponent,            canActivate: [ManageGuard.isDomainSelected]},

    // Operations
    {path: 'operations',         component: DomainOperationsComponent, canActivate: [ManageGuard.canManageDomain]},

    // Users
    {path: 'users',              component: UserManagerComponent,      canActivate: [ManageGuard.isSuper]},
    {path: 'users/:id',          component: UserPropertiesComponent,   canActivate: [ManageGuard.isSuper]},
    {path: 'users/:id/edit',     component: UserEditComponent,         canActivate: [ManageGuard.isSuper]},

    // Account
    {path: 'account/profile',    component: ProfileComponent},
];

// Make a parent route object, protected by the AuthGuard
const routes: Routes = [{
    path:                  '',
    component:             ControlCenterComponent,
    canActivate:           [AuthGuard.isAuthenticatedActivate],
    runGuardsAndResolvers: 'always', // Auth status can change over time, without a change in route or params
    children,
}];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class ManageRoutingModule {}
