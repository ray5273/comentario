import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentStatusBadgeComponent } from './comment-status-badge.component';

describe('CommentStatusBadgeComponent', () => {

    let component: CommentStatusBadgeComponent;
    let fixture: ComponentFixture<CommentStatusBadgeComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CommentStatusBadgeComponent],
        });
        fixture = TestBed.createComponent(CommentStatusBadgeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
