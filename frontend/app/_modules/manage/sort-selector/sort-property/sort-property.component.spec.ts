import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortPropertyComponent } from './sort-property.component';

describe('SortPropertyComponent', () => {

    let component: SortPropertyComponent;
    let fixture: ComponentFixture<SortPropertyComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [SortPropertyComponent],
        });
        fixture = TestBed.createComponent(SortPropertyComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
