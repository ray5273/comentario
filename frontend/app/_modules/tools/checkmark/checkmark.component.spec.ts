import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { CheckmarkComponent } from './checkmark.component';

describe('CheckmarkComponent', () => {

    let component: CheckmarkComponent;
    let fixture: ComponentFixture<CheckmarkComponent>;
    let icon: () => HTMLElement;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [FontAwesomeTestingModule, CheckmarkComponent],
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

    [
        {in: undefined, shown: false},
        {in: null,      shown: false},
        {in: false,     shown: false},
        {in: 0,         shown: false},
        {in: '',        shown: false},
        {in: true,      shown: true},
        {in: 1,         shown: true},
        {in: 'foo',     shown: true},
    ]
        .forEach(test =>
            it(`is ${test.shown ? 'shown' : 'hidden'} when value is ${test.in}`, () => {
                fixture.componentRef.setInput('value', test.in);
                fixture.detectChanges();
                if (test.shown) {
                    expect(icon()).toBeTruthy();
                } else {
                    expect(icon()).toBeNull();
                }
            }));
});
