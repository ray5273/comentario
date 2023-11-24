import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockProvider } from 'ng-mocks';
import { FederatedLoginComponent } from './federated-login.component';
import { ToolsModule } from '../../tools/tools.module';
import { ApiGeneralService, Configuration } from '../../../../generated-api';
import { ConfigService } from '../../../_services/config.service';
import { ToastService } from '../../../_services/toast.service';
import { mockAuthService } from '../../../_utils/_mocks.spec';

describe('FederatedLoginComponent', () => {

    let component: FederatedLoginComponent;
    let fixture: ComponentFixture<FederatedLoginComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [FederatedLoginComponent],
            imports: [RouterTestingModule, ToolsModule],
            providers: [
                {provide: Configuration, useValue: new Configuration()},
                MockProvider(ApiGeneralService),
                MockProvider(ConfigService, {staticConfig: {federatedIdps: []} as any}),
                MockProvider(ToastService),
                mockAuthService(),
            ],
        });
        fixture = TestBed.createComponent(FederatedLoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
