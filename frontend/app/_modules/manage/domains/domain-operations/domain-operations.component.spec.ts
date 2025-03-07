import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponent, MockModule, MockProvider } from 'ng-mocks';
import { DomainOperationsComponent } from './domain-operations.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { DomainBadgeComponent } from '../../badges/domain-badge/domain-badge.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { DomainEventService } from '../../_services/domain-event.service';

describe('DomainOperationsComponent', () => {

    let component: DomainOperationsComponent;
    let fixture: ComponentFixture<DomainOperationsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FontAwesomeTestingModule,
                    MockModule(NgbCollapseModule),
                    DomainOperationsComponent,
                    MockComponent(DomainBadgeComponent),
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(ToastService),
                    MockProvider(DomainEventService),
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
