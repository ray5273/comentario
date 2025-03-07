import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponents, MockPipes, MockProvider } from 'ng-mocks';
import { DomainEditComponent } from './domain-edit.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { ModeratorNotifyPolicyPipe } from '../../_pipes/moderator-notify-policy.pipe';
import { CommentSortPipe } from '../../_pipes/comment-sort.pipe';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { mockConfigService, mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { DomainEditGeneralComponent } from './domain-edit-general/domain-edit-general.component';
import { DomainEditAuthComponent } from './domain-edit-auth/domain-edit-auth.component';
import { DomainEditModerationComponent } from './domain-edit-moderation/domain-edit-moderation.component';
import { DomainEditExtensionsComponent } from './domain-edit-extensions/domain-edit-extensions.component';
import { DomainEventService } from '../../_services/domain-event.service';

describe('DomainEditComponent', () => {

    let component: DomainEditComponent;
    let fixture: ComponentFixture<DomainEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    RouterModule.forRoot([]),
                    FormsModule,
                    ReactiveFormsModule,
                    NgbNavModule,
                    DomainEditComponent,
                    MockPipes(ModeratorNotifyPolicyPipe, CommentSortPipe),
                    MockComponents(
                        InfoIconComponent,
                        DomainEditGeneralComponent,
                        DomainEditAuthComponent,
                        DomainEditModerationComponent,
                        DomainEditExtensionsComponent,
                    ),
                ],
                providers: [
                    MockProvider(ApiGeneralService, {domainGet: () => of(null)} as any),
                    MockProvider(ToastService),
                    MockProvider(DomainEventService),
                    mockConfigService(),
                    mockDomainSelector(),
                ],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DomainEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
