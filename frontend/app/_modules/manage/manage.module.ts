import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbCollapseModule, NgbDropdownModule, NgbNavModule, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { Highlight } from 'ngx-highlightjs';
import { ManageRoutingModule } from './manage-routing.module';
import { ControlCenterComponent } from './control-center/control-center.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropertiesComponent } from './domains/domain-properties/domain-properties.component';
import { DomainStatsComponent } from './domains/domain-stats/domain-stats.component';
import { DomainOperationsComponent } from './domains/domain-operations/domain-operations.component';
import { DailyStatsChartComponent } from './stats/daily-stats-chart/daily-stats-chart.component';
import { DomainSelectorService } from './_services/domain-selector.service';
import { CommentManagerComponent } from './domains/comments/comment-manager/comment-manager.component';
import { UserManagerComponent } from './users/user-manager/user-manager.component';
import { ManageGuard } from './_guards/manage.guard';
import { ModeratorNotifyPolicyPipe } from './_pipes/moderator-notify-policy.pipe';
import { CommentSortPipe } from './_pipes/comment-sort.pipe';
import { DomainPageManagerComponent } from './domains/domain-pages/domain-page-manager/domain-page-manager.component';
import { DomainBadgeComponent } from './badges/domain-badge/domain-badge.component';
import { SortSelectorComponent } from './sort-selector/sort-selector.component';
import { SortPropertyComponent } from './sort-selector/sort-property/sort-property.component';
import { DomainUserRoleBadgeComponent } from './badges/domain-user-role-badge/domain-user-role-badge.component';
import { DatetimePipe } from './_pipes/datetime.pipe';
import { DomainPagePropertiesComponent } from './domains/domain-pages/domain-page-properties/domain-page-properties.component';
import { CommentListComponent } from './domains/comments/comment-list/comment-list.component';
import { UserPropertiesComponent } from './users/user-properties/user-properties.component';
import { UserEditComponent } from './users/user-edit/user-edit.component';
import { CurrentUserBadgeComponent } from './badges/current-user-badge/current-user-badge.component';
import { DomainUserManagerComponent } from './domains/domain-users/domain-user-manager/domain-user-manager.component';
import { DomainUserPropertiesComponent } from './domains/domain-users/domain-user-properties/domain-user-properties.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { DomainUserEditComponent } from './domains/domain-users/domain-user-edit/domain-user-edit.component';
import { DomainSsoSecretComponent } from './domains/domain-sso-secret/domain-sso-secret.component';
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { CommentPropertiesComponent } from './domains/comments/comment-properties/comment-properties.component';
import { CommentStatusBadgeComponent } from './badges/comment-status-badge/comment-status-badge.component';
import { MetricCardComponent } from './dashboard/metric-card/metric-card.component';
import { CommentService } from './_services/comment.service';
import { ConfigManagerComponent } from './config/config-manager/config-manager.component';
import { StaticConfigComponent } from './config/static-config/static-config.component';
import { DynamicConfigComponent } from './config/dynamic-config/dynamic-config.component';
import { ConfigEditComponent } from './config/config-edit/config-edit.component';
import { DomainInstallComponent } from './domains/domain-properties/domain-install/domain-install.component';
import { UserLinkComponent } from './user-link/user-link.component';
import { DynConfigItemNamePipe } from './_pipes/dyn-config-item-name.pipe';
import { DynConfigItemValueComponent } from './dyn-config-item-value/dyn-config-item-value.component';
import { DynConfigSectionNamePipe } from './_pipes/dyn-config-section-name.pipe';
import { ConfigSectionEditComponent } from './config/config-section-edit/config-section-edit.component';
import { DomainEditGeneralComponent } from './domains/domain-edit/domain-edit-general/domain-edit-general.component';
import { DomainEditAuthComponent } from './domains/domain-edit/domain-edit-auth/domain-edit-auth.component';
import { DomainEditModerationComponent } from './domains/domain-edit/domain-edit-moderation/domain-edit-moderation.component';
import { DomainEditExtensionsComponent } from './domains/domain-edit/domain-edit-extensions/domain-edit-extensions.component';
import { UpdatesBadgeComponent } from './badges/updates-badge/updates-badge.component';
import { CountryNamePipe } from './_pipes/country-name.pipe';
import { AttributeTableComponent } from './attribute-table/attribute-table.component';
import { PieStatsChartComponent } from './stats/pie-stats-chart/pie-stats-chart.component';
import { TopPagesStatsComponent } from './stats/top-pages-stats/top-pages-stats.component';
import { StatsComponent } from './stats/stats/stats.component';
import { EmailUpdateComponent } from './account/email-update/email-update.component';
import { DomainPageEditComponent } from './domains/domain-pages/domain-page-edit/domain-page-edit.component';
import { SuperuserBadgeComponent } from './badges/superuser-badge/superuser-badge.component';

@NgModule({
    imports: [
        AttributeTableComponent,
        CommentListComponent,
        CommentManagerComponent,
        CommentPropertiesComponent,
        CommentSortPipe,
        CommentStatusBadgeComponent,
        CommonModule,
        ConfigEditComponent,
        ConfigManagerComponent,
        ConfigSectionEditComponent,
        ControlCenterComponent,
        CountryNamePipe,
        CurrentUserBadgeComponent,
        DailyStatsChartComponent,
        DashboardComponent,
        DatetimePipe,
        DomainBadgeComponent,
        DomainDetailComponent,
        DomainEditAuthComponent,
        DomainEditComponent,
        DomainEditExtensionsComponent,
        DomainEditGeneralComponent,
        DomainEditModerationComponent,
        DomainImportComponent,
        DomainInstallComponent,
        DomainManagerComponent,
        DomainOperationsComponent,
        DomainPageEditComponent,
        DomainPageManagerComponent,
        DomainPagePropertiesComponent,
        DomainPropertiesComponent,
        DomainSsoSecretComponent,
        DomainStatsComponent,
        DomainUserEditComponent,
        DomainUserManagerComponent,
        DomainUserPropertiesComponent,
        DomainUserRoleBadgeComponent,
        DynamicConfigComponent,
        DynConfigItemNamePipe,
        DynConfigItemValueComponent,
        DynConfigSectionNamePipe,
        EmailUpdateComponent,
        FontAwesomeModule,
        FormsModule,
        Highlight,
        ManageRoutingModule,
        MetricCardComponent,
        ModeratorNotifyPolicyPipe,
        NgbCollapseModule,
        NgbDropdownModule,
        NgbNavModule,
        NgbTooltip,
        NgOptimizedImage,
        PieStatsChartComponent,
        ProfileComponent,
        ReactiveFormsModule,
        RouterModule,
        SortPropertyComponent,
        SortSelectorComponent,
        StaticConfigComponent,
        StatsComponent,
        SuperuserBadgeComponent,
        TopPagesStatsComponent,
        UpdatesBadgeComponent,
        UserDetailsComponent,
        UserEditComponent,
        UserLinkComponent,
        UserManagerComponent,
        UserPropertiesComponent,
    ],
    providers: [
        CommentService,
        DomainSelectorService,
        ManageGuard,
    ],
})
export class ManageModule {}
