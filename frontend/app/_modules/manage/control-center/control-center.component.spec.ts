import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockComponents, MockDirective, MockProvider } from 'ng-mocks';
import { ControlCenterComponent } from './control-center.component';
import { ConfirmDirective } from '../../tools/_directives/confirm.directive';
import { CommentService } from '../_services/comment.service';
import { UserAvatarComponent } from '../../tools/user-avatar/user-avatar.component';
import { mockConfigService, mockDomainSelector } from '../../../_utils/_mocks.spec';
import { AuthService } from '../../../_services/auth.service';

describe('ControlCenterComponent', () => {

    let component: ControlCenterComponent;
    let fixture: ComponentFixture<ControlCenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FontAwesomeTestingModule,
                    ControlCenterComponent,
                    MockDirective(ConfirmDirective),
                    MockComponents(UserAvatarComponent),
                ],
                providers: [
                    mockDomainSelector(),
                    mockConfigService(),
                    MockProvider(AuthService),
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
