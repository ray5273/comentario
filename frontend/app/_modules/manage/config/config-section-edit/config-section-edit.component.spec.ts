import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigSectionEditComponent } from './config-section-edit.component';

describe('ConfigSectionEditComponent', () => {

    let component: ConfigSectionEditComponent;
    let fixture: ComponentFixture<ConfigSectionEditComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [ConfigSectionEditComponent],
            })
            .compileComponents();

        fixture = TestBed.createComponent(ConfigSectionEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
