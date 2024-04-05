import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockComponents, MockProviders } from 'ng-mocks';
import { UserDetailsComponent } from './user-details.component';
import { UserAvatarComponent } from '../../../tools/user-avatar/user-avatar.component';
import { ToastService } from '../../../../_services/toast.service';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';

describe('UserDetailsComponent', () => {

    let component: UserDetailsComponent;
    let fixture: ComponentFixture<UserDetailsComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [UserDetailsComponent, MockComponents(UserAvatarComponent)],
            imports: [RouterModule.forRoot([]), ToolsModule],
            providers: MockProviders(ToastService, ApiGeneralService),
        });
        fixture = TestBed.createComponent(UserDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
