import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynConfigItemValueComponent } from './dyn-config-item-value.component';

describe('DynConfigItemValueComponent', () => {

    let component: DynConfigItemValueComponent;
    let fixture: ComponentFixture<DynConfigItemValueComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [DynConfigItemValueComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(DynConfigItemValueComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
