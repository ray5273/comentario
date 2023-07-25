import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockComponents, MockProvider } from 'ng-mocks';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainUserManagerComponent } from './domain-user-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { NoDataComponent } from '../../no-data/no-data.component';

describe('DomainUserManagerComponent', () => {

    let component: DomainUserManagerComponent;
    let fixture: ComponentFixture<DomainUserManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainUserManagerComponent, MockComponents(DomainBadgeComponent, NoDataComponent)],
            providers: [
                MockProvider(DomainSelectorService, {domainMeta: of(new DomainMeta())}),
            ],
        });
        fixture = TestBed.createComponent(DomainUserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
