import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';
import { AttributeTableComponent } from './attribute-table.component';

describe('AttributeTableComponent', () => {

    let component: AttributeTableComponent;
    let fixture: ComponentFixture<AttributeTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [AttributeTableComponent],
                imports: [NgbCollapseModule, FontAwesomeTestingModule],
            })
            .compileComponents();

        fixture = TestBed.createComponent(AttributeTableComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
