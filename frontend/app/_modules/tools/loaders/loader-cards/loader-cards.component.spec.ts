import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoaderCardsComponent } from './loader-cards.component';

describe('LoaderCardsComponent', () => {

    let component: LoaderCardsComponent;
    let fixture: ComponentFixture<LoaderCardsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [LoaderCardsComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(LoaderCardsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
