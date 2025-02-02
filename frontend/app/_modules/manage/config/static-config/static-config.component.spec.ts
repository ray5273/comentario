import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockPipes } from 'ng-mocks';
import { StaticConfigComponent } from './static-config.component';
import { DatetimePipe } from '../../_pipes/datetime.pipe';
import { mockConfigService } from '../../../../_utils/_mocks.spec';

describe('StaticConfigComponent', () => {

    let component: StaticConfigComponent;
    let fixture: ComponentFixture<StaticConfigComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [StaticConfigComponent, MockPipes(DatetimePipe)],
                providers: [
                    mockConfigService(),
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
