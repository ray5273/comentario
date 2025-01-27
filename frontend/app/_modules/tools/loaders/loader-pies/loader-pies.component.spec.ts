import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoaderPiesComponent } from './loader-pies.component';

describe('LoaderPiesComponent', () => {

    let component: LoaderPiesComponent;
    let fixture: ComponentFixture<LoaderPiesComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [LoaderPiesComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(LoaderPiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
