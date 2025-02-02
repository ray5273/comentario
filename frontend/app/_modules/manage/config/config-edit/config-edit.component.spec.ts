import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MockProvider } from 'ng-mocks';
import { ConfigEditComponent } from './config-edit.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToastService } from '../../../../_services/toast.service';
import { mockConfigService } from '../../../../_utils/_mocks.spec';

describe('ConfigEditComponent', () => {

    let component: ConfigEditComponent;
    let fixture: ComponentFixture<ConfigEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), ReactiveFormsModule, ConfigEditComponent],
                providers: [
                    MockProvider(ApiGeneralService),
                    MockProvider(ToastService),
                    mockConfigService(),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(ConfigEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
