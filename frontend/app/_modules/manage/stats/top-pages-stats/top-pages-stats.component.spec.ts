import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopPagesStatsComponent } from './top-pages-stats.component';
import { MockProvider } from 'ng-mocks';
import { ApiGeneralService } from '../../../../../generated-api';
import { ToolsModule } from '../../../tools/tools.module';

describe('TopPagesStatsComponent', () => {

    let component: TopPagesStatsComponent;
    let fixture: ComponentFixture<TopPagesStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [TopPagesStatsComponent],
                providers: [
                    MockProvider(ApiGeneralService),
                ],
                imports: [ToolsModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(TopPagesStatsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
