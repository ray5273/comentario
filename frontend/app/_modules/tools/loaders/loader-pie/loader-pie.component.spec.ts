import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoaderPieComponent } from './loader-pie.component';

describe('LoaderPieComponent', () => {

    let component: LoaderPieComponent;
    let fixture: ComponentFixture<LoaderPieComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [LoaderPieComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(LoaderPieComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
