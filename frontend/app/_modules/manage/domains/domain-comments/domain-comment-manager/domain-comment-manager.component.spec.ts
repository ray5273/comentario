import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponents } from 'ng-mocks';
import { DomainCommentManagerComponent } from './domain-comment-manager.component';
import { DomainBadgeComponent } from '../../domain-badge/domain-badge.component';
import { DomainCommentListComponent } from '../comment-list/domain-comment-list.component';

describe('DomainCommentManagerComponent', () => {

    let component: DomainCommentManagerComponent;
    let fixture: ComponentFixture<DomainCommentManagerComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [DomainCommentManagerComponent, MockComponents(DomainBadgeComponent, DomainCommentListComponent)],
        });
        fixture = TestBed.createComponent(DomainCommentManagerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('is created', () => {
        expect(component).toBeTruthy();
    });
});
