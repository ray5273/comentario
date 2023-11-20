import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbCollapseModule, NgbDropdownModule, NgbNavModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { NgChartsModule } from 'ng2-charts';
import { ManageRoutingModule } from './manage-routing.module';
import { ControlCenterComponent } from './control-center/control-center.component';
import { ToolsModule } from '../tools/tools.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropertiesComponent } from './domains/domain-properties/domain-properties.component';
import { DomainStatsComponent } from './domains/domain-stats/domain-stats.component';
import { DomainOperationsComponent } from './domains/domain-operations/domain-operations.component';
import { StatsChartComponent } from './stats-chart/stats-chart.component';
import { DomainSelectorService } from './_services/domain-selector.service';
import { CommentManagerComponent } from './domains/comments/comment-manager/comment-manager.component';
import { UserManagerComponent } from './users/user-manager/user-manager.component';
import { ManageGuard } from './_guards/manage.guard';
import { ModeratorNotifyPolicyPipe } from './_pipes/moderator-notify-policy.pipe';
import { CommentSortPipe } from './_pipes/comment-sort.pipe';
import { DomainPageManagerComponent } from './domains/domain-pages/domain-page-manager/domain-page-manager.component';
import { DomainBadgeComponent } from './domains/domain-badge/domain-badge.component';
import { SortSelectorComponent } from './sort-selector/sort-selector.component';
import { SortPropertyComponent } from './sort-selector/sort-property/sort-property.component';
import { DomainUserBadgeComponent } from './domain-user-badge/domain-user-badge.component';
import { DatetimePipe } from './_pipes/datetime.pipe';
import { DomainPagePropertiesComponent } from './domains/domain-pages/domain-page-properties/domain-page-properties.component';
import { CommentListComponent } from './domains/comments/comment-list/comment-list.component';
import { UserPropertiesComponent } from './users/user-properties/user-properties.component';
import { UserEditComponent } from './users/user-edit/user-edit.component';
import { CurrentUserBadgeComponent } from './current-user-badge/current-user-badge.component';
import { DomainUserManagerComponent } from './domains/domain-users/domain-user-manager/domain-user-manager.component';
import { DomainUserPropertiesComponent } from './domains/domain-users/domain-user-properties/domain-user-properties.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { DomainUserEditComponent } from './domains/domain-users/domain-user-edit/domain-user-edit.component';
import { DomainSsoSecretComponent } from './domains/domain-sso-secret/domain-sso-secret.component';
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { CommentPropertiesComponent } from './domains/comments/comment-properties/comment-properties.component';
import { CommentStatusBadgeComponent } from './domains/comments/comment-status-badge/comment-status-badge.component';
import { MetricCardComponent } from './dashboard/metric-card/metric-card.component';
import { CommentService } from './_services/comment.service';
import { ConfigManagerComponent } from './config/config-manager/config-manager.component';
import { StaticConfigComponent } from './config/static-config/static-config.component';
import { DynamicConfigComponent } from './config/dynamic-config/dynamic-config.component';
import { ConfigEditComponent } from './config/config-edit/config-edit.component';
import { DomainInstallComponent } from './domains/domain-properties/domain-install/domain-install.component';

@NgModule({
    declarations: [
        CommentListComponent,
        CommentManagerComponent,
        CommentPropertiesComponent,
        CommentSortPipe,
        CommentStatusBadgeComponent,
        ConfigEditComponent,
        ConfigManagerComponent,
        ControlCenterComponent,
        CurrentUserBadgeComponent,
        DashboardComponent,
        DatetimePipe,
        DomainBadgeComponent,
        DomainDetailComponent,
        DomainEditComponent,
        DomainImportComponent,
        DomainManagerComponent,
        DomainOperationsComponent,
        DomainPageManagerComponent,
        DomainPagePropertiesComponent,
        DomainPropertiesComponent,
        DomainSsoSecretComponent,
        DomainStatsComponent,
        DomainUserBadgeComponent,
        DomainUserEditComponent,
        DomainUserManagerComponent,
        DomainUserPropertiesComponent,
        DynamicConfigComponent,
        MetricCardComponent,
        ModeratorNotifyPolicyPipe,
        ProfileComponent,
        SortPropertyComponent,
        SortSelectorComponent,
        StaticConfigComponent,
        StatsChartComponent,
        UserDetailsComponent,
        UserEditComponent,
        UserManagerComponent,
        UserPropertiesComponent,
        DomainInstallComponent,
    ],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        FontAwesomeModule,
        NgbCollapseModule,
        NgbDropdownModule,
        NgbNavModule,
        NgbTooltip,
        NgChartsModule,
        ToolsModule,
        ManageRoutingModule,
        NgOptimizedImage,
    ],
    providers: [
        CommentService,
        DomainSelectorService,
        ManageGuard,
    ],
})
export class ManageModule {}
