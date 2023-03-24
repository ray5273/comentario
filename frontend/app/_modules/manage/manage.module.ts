import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageRoutingModule } from './manage-routing.module';
import { ControlCenterComponent } from './control-center/control-center.component';
import { ToolsModule } from '../tools/tools.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';

@NgModule({
    declarations: [
    ControlCenterComponent,
    DashboardComponent,
    DomainManagerComponent,
  ],
    imports: [
        CommonModule,
        FontAwesomeModule,
        ToolsModule,
        ManageRoutingModule,
    ],
})
export class ManageModule {}
