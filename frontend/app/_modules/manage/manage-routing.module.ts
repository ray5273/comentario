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
import { CommentManagerComponent } from './domains/comments/comment-manager/comment-manager.component';
import { UserManagerComponent } from './users/user-manager/user-manager.component';
import { DomainStatsComponent } from './domains/domain-stats/domain-stats.component';
import { DomainOperationsComponent } from './domains/domain-operations/domain-operations.component';
import { ManageGuard } from './_guards/manage.guard';
import { DomainPageManagerComponent } from './domains/domain-pages/domain-page-manager/domain-page-manager.component';
import { DomainPagePropertiesComponent } from './domains/domain-pages/domain-page-properties/domain-page-properties.component';
import { UserPropertiesComponent } from './users/user-properties/user-properties.component';
import { UserEditComponent } from './users/user-edit/user-edit.component';
import { DomainUserManagerComponent } from './domains/domain-users/domain-user-manager/domain-user-manager.component';
import { DomainUserPropertiesComponent } from './domains/domain-users/domain-user-properties/domain-user-properties.component';
import { DomainUserEditComponent } from './domains/domain-users/domain-user-edit/domain-user-edit.component';
import { DomainSsoSecretComponent } from './domains/domain-sso-secret/domain-sso-secret.component';
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { CommentPropertiesComponent } from './domains/comments/comment-properties/comment-properties.component';
import { ConfigManagerComponent } from './config/config-manager/config-manager.component';
import { StaticConfigComponent } from './config/static-config/static-config.component';
import { DynamicConfigComponent } from './config/dynamic-config/dynamic-config.component';
import { ConfigEditComponent } from './config/config-edit/config-edit.component';
import { EmailUpdateComponent } from './account/email-update/email-update.component';
import { DomainPageEditComponent } from './domains/domain-pages/domain-page-edit/domain-page-edit.component';
import { DomainPageMoveDataComponent } from './domains/domain-pages/domain-page-move-data/domain-page-move-data.component';

const children: Routes = [
    // Default route
    {path: '', pathMatch: 'full', redirectTo: 'dashboard'},

    // Dashboard
    {path: 'dashboard',      component: DashboardComponent},

    // Domains
    {path: 'domains',        component: DomainManagerComponent},
    {path: 'domains/create', component: DomainEditComponent, data: {new: true, clean: true}},
    {
        path: 'domains/:domainId',
        component: DomainDetailComponent,
        children: [
            {path: '', pathMatch: 'full', component: DomainPropertiesComponent,     canActivate: [ManageGuard.isDomainSelected]},
            {path: 'edit',                component: DomainEditComponent,           canActivate: [ManageGuard.canManageDomain]},
            {path: 'clone',               component: DomainEditComponent,           canActivate: [ManageGuard.canManageDomain], data: {new: true}},
            {path: 'import',              component: DomainImportComponent,         canActivate: [ManageGuard.canManageDomain]},
            {path: 'sso',                 component: DomainSsoSecretComponent,      canActivate: [ManageGuard.canManageDomainSso]},

            // Pages
            {path: 'pages',               component: DomainPageManagerComponent,    canActivate: [ManageGuard.isDomainSelected]},
            {path: 'pages/:id',           component: DomainPagePropertiesComponent, canActivate: [ManageGuard.isDomainSelected]},
            {path: 'pages/:id/edit',      component: DomainPageEditComponent,       canActivate: [ManageGuard.canModerateDomain]},
            {path: 'pages/:id/move',      component: DomainPageMoveDataComponent,   canActivate: [ManageGuard.canManageDomain]},

            // Comments
            {path: 'comments',            component: CommentManagerComponent,       canActivate: [ManageGuard.isDomainSelected]},
            {path: 'comments/:id',        component: CommentPropertiesComponent,    canActivate: [ManageGuard.isDomainSelected]},

            // Domain users
            {path: 'users',               component: DomainUserManagerComponent,    canActivate: [ManageGuard.canManageDomain]},
            {path: 'users/:id',           component: DomainUserPropertiesComponent, canActivate: [ManageGuard.canManageDomain]},
            {path: 'users/:id/edit',      component: DomainUserEditComponent,       canActivate: [ManageGuard.canManageDomain]},

            // Stats
            {path: 'stats',               component: DomainStatsComponent,          canActivate: [ManageGuard.canManageDomain]},

            // Operations
            {path: 'operations',          component: DomainOperationsComponent,     canActivate: [ManageGuard.canManageDomain]},

        ],
        canActivate: [ManageGuard.selectDomain],
    },

    // Users
    {path: 'users',                component: UserManagerComponent,          canActivate: [ManageGuard.isSuper]},
    {path: 'users/:id',            component: UserPropertiesComponent,       canActivate: [ManageGuard.isSuper]},
    {path: 'users/:id/edit',       component: UserEditComponent,             canActivate: [ManageGuard.isSuper]},

    // Config
    {path: 'config/edit',          component: ConfigEditComponent,           canActivate: [ManageGuard.isSuper]},
    {
        path: 'config',
        component: ConfigManagerComponent,
        children: [
            {path: '', pathMatch: 'full', redirectTo: 'static'},
            {path: 'static',       component: StaticConfigComponent},
            {path: 'dynamic',      component: DynamicConfigComponent},
            {path: 'dynamic/edit', component: ConfigEditComponent},
        ],
        canActivate: [ManageGuard.isSuper],
    },

    // Account
    {path: 'account/profile',      component: ProfileComponent},
    {path: 'account/email',        component: EmailUpdateComponent, canActivate: [ManageGuard.isLocal]},
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
