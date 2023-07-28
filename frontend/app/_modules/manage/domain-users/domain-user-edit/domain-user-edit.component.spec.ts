import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainUserEditComponent } from './domain-user-edit.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { ToastService } from '../../../../_services/toast.service';
import { DomainUserBadgeComponent } from '../../domain-user-badge/domain-user-badge.component';
import { ToolsModule } from '../../../tools/tools.module';

describe('DomainUserEditComponent', () => {

    let component: DomainUserEditComponent;
    let fixture: ComponentFixture<DomainUserEditComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainUserEditComponent, MockComponents(DomainUserBadgeComponent)],
            imports: [RouterTestingModule, ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
                MockProvider(ToastService),
            ],
        });
        fixture = TestBed.createComponent(DomainUserEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
