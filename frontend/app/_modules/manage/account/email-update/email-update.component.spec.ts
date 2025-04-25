import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { EmailUpdateComponent } from './email-update.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { AuthService } from '../../../../_services/auth.service';

describe('EmailUpdateComponent', () => {

    let component: EmailUpdateComponent;
    let fixture: ComponentFixture<EmailUpdateComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    RouterModule.forRoot([]),
                    EmailUpdateComponent,
                ],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(AuthService),
                ],
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
