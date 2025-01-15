import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { DynamicConfigComponent } from './dynamic-config.component';
import { ConfigService } from '../../../../_services/config.service';
import { ApiGeneralService } from '../../../../../generated-api';
import { DynamicConfig } from '../../../../_models/config';

describe('DynamicConfigComponent', () => {

    let component: DynamicConfigComponent;
    let fixture: ComponentFixture<DynamicConfigComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), FontAwesomeTestingModule, DynamicConfigComponent],
                providers: [
                    MockProvider(ConfigService, {dynamicConfig: of(new DynamicConfig())}),
                    MockProvider(ApiGeneralService),
                ],
            })
            .compileComponents();
        fixture = TestBed.createComponent(DynamicConfigComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
