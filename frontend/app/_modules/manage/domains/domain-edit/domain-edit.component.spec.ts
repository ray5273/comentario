import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockPipes, MockProvider } from 'ng-mocks';
import { DomainEditComponent } from './domain-edit.component';
import { ApiGeneralService, ComentarioConfig } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';
import { ToastService } from '../../../../_services/toast.service';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ModeratorNotifyPolicyPipe } from '../../_pipes/moderator-notify-policy.pipe';
import { CommentSortPipe } from '../../_pipes/comment-sort.pipe';

describe('DomainEditComponent', () => {

    let component: DomainEditComponent;
    let fixture: ComponentFixture<DomainEditComponent>;

    const config: ComentarioConfig = {
        federatedIdps: [],
    } as any;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DomainEditComponent, MockPipes(ModeratorNotifyPolicyPipe, CommentSortPipe)],
            imports: [RouterTestingModule, FormsModule, ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ConfigService, {config}),
                MockProvider(ApiGeneralService, {domainGet: () => of(null)} as any),
                MockProvider(ToastService),
                MockProvider(DomainSelectorService, {domainUserIdps: of({})}),
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
