import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { CurrentUserBadgeComponent } from './current-user-badge.component';
import { PrincipalService } from '../../../../_services/principal.service';

describe('CurrentUserBadgeComponent', () => {

    let component: CurrentUserBadgeComponent;
    let fixture: ComponentFixture<CurrentUserBadgeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [FontAwesomeTestingModule, CurrentUserBadgeComponent],
                providers: [
                    MockProvider(PrincipalService),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(CurrentUserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
