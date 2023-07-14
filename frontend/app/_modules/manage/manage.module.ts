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
import { StatsComponent } from './stats/stats.component';
import { DomainOperationsComponent } from './domain-operations/domain-operations.component';
import { StatsChartComponent } from './stats-chart/stats-chart.component';
import { DomainSelectorService } from './_services/domain-selector.service';
import { CommentManagerComponent } from './comments/comment-manager/comment-manager.component';
import { UserManagerComponent } from './users/user-manager/user-manager.component';
import { ManageGuard } from "./_guards/manage.guard";
import { ModeratorNotifyPolicyPipe } from './_pipes/moderator-notify-policy.pipe';
import { CommentSortPipe } from './_pipes/comment-sort.pipe';
import { PageManagerComponent } from './pages/page-manager/page-manager.component';
import { DomainBadgeComponent } from './domain-badge/domain-badge.component';
import { SortSelectorComponent } from './sort-selector/sort-selector.component';
import { SortPropertyComponent } from './sort-selector/sort-property/sort-property.component';
import { DomainUserBadgeComponent } from './domain-user-badge/domain-user-badge.component';
import { DatetimePipe } from './_pipes/datetime.pipe';
import { PagePropertiesComponent } from './pages/page-properties/page-properties.component';
import { CommentListComponent } from './comments/comment-list/comment-list.component';
import { UserAvatarComponent } from './users/user-avatar/user-avatar.component';

@NgModule({
    declarations: [
        CommentListComponent,
        CommentManagerComponent,
        CommentSortPipe,
        ControlCenterComponent,
        DashboardComponent,
        DatetimePipe,
        DomainBadgeComponent,
        DomainEditComponent,
        DomainImportComponent,
        DomainManagerComponent,
        DomainOperationsComponent,
        DomainPropertiesComponent,
        DomainUserBadgeComponent,
        ModeratorNotifyPolicyPipe,
        PageManagerComponent,
        PagePropertiesComponent,
        ProfileComponent,
        SortPropertyComponent,
        SortSelectorComponent,
        StatsChartComponent,
        StatsComponent,
        UserAvatarComponent,
        UserManagerComponent,
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
        DomainSelectorService,
        ManageGuard,
    ],
})
export class ManageModule {}
