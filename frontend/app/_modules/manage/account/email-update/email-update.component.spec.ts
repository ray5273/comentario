import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { EmailUpdateComponent } from './email-update.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockAuthService } from '../../../../_utils/_mocks.spec';
import { ToolsModule } from '../../../tools/tools.module';

describe('EmailUpdateComponent', () => {

    let component: EmailUpdateComponent;
    let fixture: ComponentFixture<EmailUpdateComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [EmailUpdateComponent],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockAuthService(),
                ],
                imports: [ReactiveFormsModule, RouterModule.forRoot([]), ToolsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(EmailUpdateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
