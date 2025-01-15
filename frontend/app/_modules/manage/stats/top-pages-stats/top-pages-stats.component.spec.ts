import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopPagesStatsComponent } from './top-pages-stats.component';

describe('TopPagesStatsComponent', () => {

    let component: TopPagesStatsComponent;
    let fixture: ComponentFixture<TopPagesStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [TopPagesStatsComponent],
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
