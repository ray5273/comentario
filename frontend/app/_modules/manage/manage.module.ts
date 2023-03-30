import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbDropdownModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { ManageRoutingModule } from './manage-routing.module';
import { ControlCenterComponent } from './control-center/control-center.component';
import { ToolsModule } from '../tools/tools.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DomainManagerComponent } from './domains/domain-manager/domain-manager.component';
import { DomainDetailComponent } from './domains/domain-detail/domain-detail.component';
import { DomainEditComponent } from './domains/domain-edit/domain-edit.component';

@NgModule({
    declarations: [
        ControlCenterComponent,
        DashboardComponent,
        DomainManagerComponent,
        DomainDetailComponent,
        DomainEditComponent,
    ],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        FontAwesomeModule,
        NgbDropdownModule,
        NgbNavModule,
        ToolsModule,
        ManageRoutingModule,
    ],
})
export class ManageModule {}
