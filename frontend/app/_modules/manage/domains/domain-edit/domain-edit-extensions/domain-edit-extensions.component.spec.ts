import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { DomainEditExtensionsComponent } from './domain-edit-extensions.component';

describe('DomainEditExtensionsComponent', () => {

    let component: DomainEditExtensionsComponent;
    let fixture: ComponentFixture<DomainEditExtensionsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [DomainEditExtensionsComponent],
                imports: [FontAwesomeTestingModule, ReactiveFormsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditExtensionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
