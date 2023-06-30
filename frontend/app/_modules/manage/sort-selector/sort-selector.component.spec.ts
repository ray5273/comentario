import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortSelectorComponent } from './sort-selector.component';

describe('SortSelectorComponent', () => {

    let component: SortSelectorComponent;
    let fixture: ComponentFixture<SortSelectorComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [SortSelectorComponent],
        });
        fixture = TestBed.createComponent(SortSelectorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
