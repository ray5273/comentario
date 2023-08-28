import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { DynamicConfigComponent } from './dynamic-config.component';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';

describe('DynamicConfigComponent', () => {

    let component: DynamicConfigComponent;
    let fixture: ComponentFixture<DynamicConfigComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DynamicConfigComponent],
            imports: [ToolsModule],
            providers: [
                MockProvider(ConfigService, {dynamicConfig: of({}) as any}),
            ],
        });
        fixture = TestBed.createComponent(DynamicConfigComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
