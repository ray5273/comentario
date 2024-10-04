import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { MockPipes, MockProvider } from 'ng-mocks';
import { StaticConfigComponent } from './static-config.component';
import { ConfigService } from '../../../../_services/config.service';
import { ToolsModule } from '../../../tools/tools.module';
import { DatetimePipe } from '../../_pipes/datetime.pipe';

describe('StaticConfigComponent', () => {

    let component: StaticConfigComponent;
    let fixture: ComponentFixture<StaticConfigComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StaticConfigComponent, MockPipes(DatetimePipe)],
            imports: [ToolsModule],
            providers: [
                MockProvider(
                    ConfigService,
                    {
                        staticConfig:  {} as any,
                        extensions:    EMPTY,
                        isUpgradable:  EMPTY,
                        latestRelease: EMPTY,
                    }),
            ],
        })
            .compileComponents();
        fixture = TestBed.createComponent(StaticConfigComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
