import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckmarkComponent } from './checkmark.component';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';

describe('CheckmarkComponent', () => {
    let component: CheckmarkComponent;
    let fixture: ComponentFixture<CheckmarkComponent>;
    let icon: () => HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CheckmarkComponent],
            imports: [FontAwesomeTestingModule],
        })
        .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CheckmarkComponent);
        component = fixture.componentInstance;
        icon = () => fixture.nativeElement.querySelector('fa-icon');
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });

    it('is shown when no value bound', () => {
        fixture.detectChanges();
        expect(icon()).toBeTruthy();
    });

    it('is hidden when value is false', () => {
        component.value = false;
        fixture.detectChanges();
        expect(icon()).toBeNull();
    });

    it('is hidden when value is 0', () => {
        component.value = 0;
        fixture.detectChanges();
        expect(icon()).toBeNull();
    });

    it('is hidden when value is null', () => {
        component.value = null;
        fixture.detectChanges();
        expect(icon()).toBeNull();
    });

    it('is hidden when value is empty string', () => {
        component.value = '';
        fixture.detectChanges();
        expect(icon()).toBeNull();
    });

    it('is shown when value is true', () => {
        component.value = true;
        fixture.detectChanges();
        expect(icon()).toBeTruthy();
    });
});
