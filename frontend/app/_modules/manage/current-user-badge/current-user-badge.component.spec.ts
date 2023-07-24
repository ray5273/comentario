import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { CurrentUserBadgeComponent } from './current-user-badge.component';
import { AuthService } from '../../../_services/auth.service';

describe('CurrentUserBadgeComponent', () => {

    let component: CurrentUserBadgeComponent;
    let fixture: ComponentFixture<CurrentUserBadgeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CurrentUserBadgeComponent],
            providers: [
                MockProvider(AuthService, {principal: of(null)})
            ],
        });
        fixture = TestBed.createComponent(CurrentUserBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
