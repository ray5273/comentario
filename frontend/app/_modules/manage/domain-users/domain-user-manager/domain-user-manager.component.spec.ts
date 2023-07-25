import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomainUserManagerComponent } from './domain-user-manager.component';

describe('DomainUserManagerComponent', () => {

    let component: DomainUserManagerComponent;
    let fixture: ComponentFixture<DomainUserManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainUserManagerComponent],
        });
        fixture = TestBed.createComponent(DomainUserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
