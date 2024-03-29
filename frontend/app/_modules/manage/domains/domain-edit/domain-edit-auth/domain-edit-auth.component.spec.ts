import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { DomainEditAuthComponent } from './domain-edit-auth.component';

describe('DomainEditAuthComponent', () => {

    let component: DomainEditAuthComponent;
    let fixture: ComponentFixture<DomainEditAuthComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [DomainEditAuthComponent],
                imports: [FontAwesomeTestingModule, ReactiveFormsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditAuthComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
