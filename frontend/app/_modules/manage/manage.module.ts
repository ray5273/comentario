import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';
import { ProfileComponent } from './account/profile/profile.component';
import { DomainImportComponent } from './domains/domain-import/domain-import.component';
import { DomainPropertiesComponent } from './domains/domain-detail/domain-properties/domain-properties.component';
import { DomainModeratorsComponent } from './domains/domain-detail/domain-moderators/domain-moderators.component';
import { DomainStatsComponent } from './domains/domain-detail/domain-stats/domain-stats.component';
import { DomainDangerZoneComponent } from './domains/domain-detail/domain-danger-zone/domain-danger-zone.component';
import { DomainImpexComponent } from './domains/domain-detail/domain-impex/domain-impex.component';
import { StatsChartComponent } from './stats-chart/stats-chart.component';
import { DomainSelectorService } from './_services/domain-selector.service';

@NgModule({
    declarations: [
        ControlCenterComponent,
        DashboardComponent,
        DomainDangerZoneComponent,
        DomainDetailComponent,
        DomainEditComponent,
        DomainImpexComponent,
        DomainImportComponent,
        DomainManagerComponent,
        DomainModeratorsComponent,
        DomainPropertiesComponent,
        DomainStatsComponent,
        ProfileComponent,
        StatsChartComponent,
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
    ],
    providers: [
        DomainSelectorService,
    ],
})
export class ManageModule {}
