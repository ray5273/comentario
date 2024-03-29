import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { DomainEditGeneralComponent } from './domain-edit-general.component';

describe('DomainEditGeneralComponent', () => {

    let component: DomainEditGeneralComponent;
    let fixture: ComponentFixture<DomainEditGeneralComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [DomainEditGeneralComponent],
                imports: [FontAwesomeTestingModule, ReactiveFormsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditGeneralComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
