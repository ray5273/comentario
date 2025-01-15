import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { InfoBlockComponent } from './info-block.component';

describe('InfoBlockComponent', () => {

    let component: InfoBlockComponent;
    let fixture: ComponentFixture<InfoBlockComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                imports: [FontAwesomeTestingModule, InfoBlockComponent],
            })
            .compileComponents();
        fixture = TestBed.createComponent(InfoBlockComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
