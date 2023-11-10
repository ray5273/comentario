import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponent, MockModule, MockProvider } from 'ng-mocks';
import { DomainOperationsComponent } from './domain-operations.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { ToolsModule } from '../../../tools/tools.module';
import { DomainBadgeComponent } from '../domain-badge/domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainOperationsComponent', () => {

    let component: DomainOperationsComponent;
    let fixture: ComponentFixture<DomainOperationsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainOperationsComponent, MockComponent(DomainBadgeComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule, ToolsModule, MockModule(NgbCollapseModule)],
            providers: [
                MockProvider(ApiGeneralService),
                MockProvider(ToastService),
                mockDomainSelector(),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(DomainOperationsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
