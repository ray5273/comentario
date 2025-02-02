import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { MockProvider } from 'ng-mocks';
import { DynamicConfigComponent } from './dynamic-config.component';
import { ApiGeneralService } from '../../../../../generated-api';
import { mockConfigService } from '../../../../_utils/_mocks.spec';

describe('DynamicConfigComponent', () => {

    let component: DynamicConfigComponent;
    let fixture: ComponentFixture<DynamicConfigComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([]), FontAwesomeTestingModule, DynamicConfigComponent],
                providers: [
                    MockProvider(ApiGeneralService),
                    mockConfigService(),
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
