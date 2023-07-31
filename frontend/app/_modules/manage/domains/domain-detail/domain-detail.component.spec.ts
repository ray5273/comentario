import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { DomainDetailComponent } from './domain-detail.component';
import { DomainSelectorService } from '../../_services/domain-selector.service';

describe('DomainDetailComponent', () => {

    let component: DomainDetailComponent;
    let fixture: ComponentFixture<DomainDetailComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainDetailComponent],
            imports: [RouterTestingModule],
            providers: [
                MockProvider(DomainSelectorService),
            ],
        });
        fixture = TestBed.createComponent(DomainDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
