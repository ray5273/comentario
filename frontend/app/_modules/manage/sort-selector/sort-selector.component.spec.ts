import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortSelectorComponent } from './sort-selector.component';
import { Sort } from '../_models/sort';

describe('SortSelectorComponent', () => {

    let component: SortSelectorComponent;
    let fixture: ComponentFixture<SortSelectorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [SortSelectorComponent],
            })
            .compileComponents();
        fixture = TestBed.createComponent(SortSelectorComponent);
        fixture.componentRef.setInput('sort', new Sort([], 'foo', false));
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
