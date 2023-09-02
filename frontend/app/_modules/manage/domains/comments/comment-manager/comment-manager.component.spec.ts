import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents, MockProvider } from 'ng-mocks';
import { CommentManagerComponent } from './comment-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { CommentListComponent } from '../comment-list/comment-list.component';
import { CommentService } from '../../../_services/comment.service';

describe('CommentManagerComponent', () => {

    let component: CommentManagerComponent;
    let fixture: ComponentFixture<CommentManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [CommentManagerComponent, MockComponents(DomainBadgeComponent, CommentListComponent)],
            providers: [
                MockProvider(CommentService),
            ],
        });
        fixture = TestBed.createComponent(CommentManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
