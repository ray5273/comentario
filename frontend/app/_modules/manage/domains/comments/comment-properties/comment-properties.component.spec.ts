import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentPropertiesComponent } from './comment-properties.component';

describe('CommentPropertiesComponent', () => {

    let component: CommentPropertiesComponent;
    let fixture: ComponentFixture<CommentPropertiesComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CommentPropertiesComponent],
        });
        fixture = TestBed.createComponent(CommentPropertiesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
