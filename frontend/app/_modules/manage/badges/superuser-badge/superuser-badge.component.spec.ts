import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { SuperuserBadgeComponent } from './superuser-badge.component';

describe('SuperuserBadgeComponent', () => {

    let component: SuperuserBadgeComponent;
    let fixture: ComponentFixture<SuperuserBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [FontAwesomeTestingModule, SuperuserBadgeComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(SuperuserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
