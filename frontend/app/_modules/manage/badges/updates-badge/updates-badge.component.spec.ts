import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { UpdatesBadgeComponent } from './updates-badge.component';

describe('UpdatesBadgeComponent', () => {

    let component: UpdatesBadgeComponent;
    let fixture: ComponentFixture<UpdatesBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [FontAwesomeTestingModule, UpdatesBadgeComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(UpdatesBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
