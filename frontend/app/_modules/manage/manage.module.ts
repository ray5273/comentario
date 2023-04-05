import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbCollapseModule, NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { NgChartsModule } from 'ng2-charts';
import { ManageRoutingModule } from './manage-routing.module';
import { ControlCenterComponent } from './control-center/control-center.component';
import { ToolsModule } from '../tools/tools.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropsComponent } from './domains/domain-detail/domain-props/domain-props.component';
import { DomainModeratorsComponent } from './domains/domain-detail/domain-moderators/domain-moderators.component';
import { DomainStatsComponent } from './domains/domain-detail/domain-stats/domain-stats.component';

@NgModule({
    declarations: [
        ControlCenterComponent,
        DashboardComponent,
        DomainManagerComponent,
        DomainDetailComponent,
        DomainEditComponent,
        ProfileComponent,
        DomainImportComponent,
        DomainPropsComponent,
        DomainModeratorsComponent,
        DomainStatsComponent,
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
        NgChartsModule,
        ToolsModule,
        ManageRoutingModule,
    ],
})
export class ManageModule {}
