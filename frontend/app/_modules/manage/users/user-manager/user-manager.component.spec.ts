import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent } from 'ng-mocks';
import { UserManagerComponent } from './user-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';

describe('UserManagerComponent', () => {

    let component: UserManagerComponent;
    let fixture: ComponentFixture<UserManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UserManagerComponent, MockComponent(DomainBadgeComponent)],
        });
        fixture = TestBed.createComponent(UserManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
