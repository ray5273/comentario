import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ApiAuthService } from '../../../../generated-api';
import { getApiAuthServiceMock, ToastServiceMock } from '../../../_testing/mocks.spec';
import { ToastService } from '../../../_services/toast.service';
import { ToolsModule } from '../../tools/tools.module';

describe('ForgotPasswordComponent', () => {

    let component: ForgotPasswordComponent;
    let fixture: ComponentFixture<ForgotPasswordComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ForgotPasswordComponent],
            imports: [RouterTestingModule, ReactiveFormsModule, ToolsModule],
            providers: [
                {provide: ApiAuthService, useValue: getApiAuthServiceMock()},
                {provide: ToastService,   useValue: ToastServiceMock},
            ],
        })
            .compileComponents();

        fixture = TestBed.createComponent(ForgotPasswordComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
