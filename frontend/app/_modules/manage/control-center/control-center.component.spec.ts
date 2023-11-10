import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockDirective, MockProvider } from 'ng-mocks';
import { AuthService } from '../../../_services/auth.service';
import { ControlCenterComponent } from './control-center.component';
import { ConfirmDirective } from '../../tools/_directives/confirm.directive';
import { CommentService } from '../_services/comment.service';
import { UserAvatarComponent } from '../../tools/user-avatar/user-avatar.component';
import { mockDomainSelector } from '../../../_utils/_mocks.spec';

describe('ControlCenterComponent', () => {

    let component: ControlCenterComponent;
    let fixture: ComponentFixture<ControlCenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ControlCenterComponent, MockDirective(ConfirmDirective), MockComponents(UserAvatarComponent)],
            imports: [RouterTestingModule, FontAwesomeTestingModule],
            providers: [
                MockProvider(AuthService, {principal: of(null)}),
                mockDomainSelector(),
                MockProvider(CommentService, {countPending: of(0)}),
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(ControlCenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
