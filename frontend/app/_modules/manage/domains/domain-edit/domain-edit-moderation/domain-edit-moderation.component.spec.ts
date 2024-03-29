import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { DomainEditModerationComponent } from './domain-edit-moderation.component';

describe('DomainEditModerationComponent', () => {

    let component: DomainEditModerationComponent;
    let fixture: ComponentFixture<DomainEditModerationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [DomainEditModerationComponent],
                imports: [FontAwesomeTestingModule, ReactiveFormsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditModerationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
