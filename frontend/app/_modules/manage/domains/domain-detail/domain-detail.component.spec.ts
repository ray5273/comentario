import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { DomainDetailComponent } from './domain-detail.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';

describe('DomainDetailComponent', () => {

    let component: DomainDetailComponent;
    let fixture: ComponentFixture<DomainDetailComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainDetailComponent],
            imports: [RouterModule.forRoot([])],
            providers: [
                mockDomainSelector(),
            ],
        })
            .compileComponents();
        fixture = TestBed.createComponent(DomainDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
