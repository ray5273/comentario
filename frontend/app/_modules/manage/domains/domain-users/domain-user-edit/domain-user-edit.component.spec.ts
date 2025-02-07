import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserEditComponent } from './domain-user-edit.component';
import { ApiGeneralService } from '../../../../../../generated-api';
import { ToastService } from '../../../../../_services/toast.service';
import { DomainUserRoleBadgeComponent } from '../../../badges/domain-user-role-badge/domain-user-role-badge.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainUserEditComponent', () => {

    let component: DomainUserEditComponent;
    let fixture: ComponentFixture<DomainUserEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    ReactiveFormsModule,
                    DomainUserEditComponent,
                    MockComponents(DomainUserRoleBadgeComponent, InfoIconComponent),
                ],
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
