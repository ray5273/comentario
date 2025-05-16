import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainPageDetailsComponent } from './domain-page-details.component';
import { mockDomainSelector } from '../../../../../_utils/_mocks.spec';

describe('DomainPageDetailsComponent', () => {

    let component: DomainPageDetailsComponent;
    let fixture: ComponentFixture<DomainPageDetailsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DomainPageDetailsComponent],
                providers: [
                    mockDomainSelector(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainPageDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
