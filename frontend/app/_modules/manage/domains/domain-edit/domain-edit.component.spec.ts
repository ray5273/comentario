import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { MockComponents, MockPipes, MockProvider } from 'ng-mocks';
import { DomainEditComponent } from './domain-edit.component';
import { ApiGeneralService, InstanceStaticConfig } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';
import { ToastService } from '../../../../_services/toast.service';
import { ModeratorNotifyPolicyPipe } from '../../_pipes/moderator-notify-policy.pipe';
import { CommentSortPipe } from '../../_pipes/comment-sort.pipe';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { mockDomainSelector } from '../../../../_utils/_mocks.spec';
import { DomainEditGeneralComponent } from './domain-edit-general/domain-edit-general.component';
import { DomainEditAuthComponent } from './domain-edit-auth/domain-edit-auth.component';
import { DomainEditModerationComponent } from './domain-edit-moderation/domain-edit-moderation.component';
import { DomainEditExtensionsComponent } from './domain-edit-extensions/domain-edit-extensions.component';

describe('DomainEditComponent', () => {

    let component: DomainEditComponent;
    let fixture: ComponentFixture<DomainEditComponent>;

    const config: InstanceStaticConfig = {
        federatedIdps: [],
    } as any;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [
                DomainEditComponent,
                MockPipes(ModeratorNotifyPolicyPipe, CommentSortPipe),
                MockComponents(InfoIconComponent,
                    DomainEditGeneralComponent,
                    DomainEditAuthComponent,
                    DomainEditModerationComponent,
                    DomainEditExtensionsComponent),
            ],
            imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, NgbNavModule, ToolsModule],
            providers: [
                MockProvider(ConfigService, {staticConfig: config, extensions: of(undefined)}),
                MockProvider(ApiGeneralService, {domainGet: () => of(null)} as any),
                MockProvider(ToastService),
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
