import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeTestingModule } from '@fortawesome/angular-fontawesome/testing';

describe('ConfirmDialogComponent', () => {

    let component: ConfirmDialogComponent;
    let fixture: ComponentFixture<ConfirmDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ConfirmDialogComponent],
            imports: [FontAwesomeTestingModule],
            providers: [NgbActiveModal],
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ConfirmDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
