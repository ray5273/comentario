import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { FederatedLoginComponent } from './federated-login.component';
import { ApiGeneralService, Configuration } from '../../../../generated-api';
import { ToastService } from '../../../_services/toast.service';
import { mockAuthService, mockConfigService } from '../../../_utils/_mocks.spec';

describe('FederatedLoginComponent', () => {

    let component: FederatedLoginComponent;
    let fixture: ComponentFixture<FederatedLoginComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), FederatedLoginComponent],
                providers: [
                    {provide: Configuration, useValue: new Configuration()},
                    MockProvider(ApiGeneralService),
                    MockProvider(ToastService),
                    mockAuthService(),
                    mockConfigService(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(FederatedLoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
