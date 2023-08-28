import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { ConfigParamEditComponent } from './config-param-edit.component';
import { ConfigService } from '../../../../_services/config.service';

describe('DynamicConfigParamEditComponent', () => {

    let component: ConfigParamEditComponent;
    let fixture: ComponentFixture<ConfigParamEditComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ConfigParamEditComponent],
            providers: [
                MockProvider(ConfigService, {dynamicConfig: of({}) as any}),
            ],
        });
        fixture = TestBed.createComponent(ConfigParamEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
