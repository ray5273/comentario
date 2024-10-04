import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { ConfigEditComponent } from './config-edit.component';
import { ConfigService } from '../../../../_services/config.service';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';
import { ToastService } from '../../../../_services/toast.service';
import { DynamicConfig } from '../../../../_models/config';

describe('ConfigEditComponent', () => {

    let component: ConfigEditComponent;
    let fixture: ComponentFixture<ConfigEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ConfigEditComponent],
            imports: [ReactiveFormsModule, ToolsModule],
            providers: [
                MockProvider(ConfigService, {dynamicConfig: of(new DynamicConfig())}),
                MockProvider(ApiGeneralService),
                MockProvider(ToastService),
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
