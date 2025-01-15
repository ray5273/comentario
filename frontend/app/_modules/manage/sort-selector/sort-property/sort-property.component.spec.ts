import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortPropertyComponent } from './sort-property.component';

describe('SortPropertyComponent', () => {

    let component: SortPropertyComponent;
    let fixture: ComponentFixture<SortPropertyComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [SortPropertyComponent],
            })
            .compileComponents();
        fixture = TestBed.createComponent(SortPropertyComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
