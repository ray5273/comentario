import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DomainDetailComponent } from './domain-detail.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainDetailComponent', () => {

    let component: DomainDetailComponent;
    let fixture: ComponentFixture<DomainDetailComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainDetailComponent],
            imports: [RouterTestingModule],
            providers: [
                mockDomainSelector(),
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
