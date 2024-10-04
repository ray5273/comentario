import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserEditComponent } from './domain-user-edit.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ToastService } from '../../../../../_services/toast.service';
import { DomainUserBadgeComponent } from '../../../badges/domain-user-badge/domain-user-badge.component';
import { ToolsModule } from '../../../../tools/tools.module';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainUserEditComponent', () => {

    let component: DomainUserEditComponent;
    let fixture: ComponentFixture<DomainUserEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainUserEditComponent, MockComponents(DomainUserBadgeComponent, InfoIconComponent)],
            imports: [RouterModule.forRoot([]), ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ToastService),
                mockDomainSelector(),
            ],
        })
            .compileComponents();
        fixture = TestBed.createComponent(DomainUserEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
