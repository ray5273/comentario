import { Component, OnInit } from '@angular/core';
import { CommentService } from '../../../_services/comment.service';
import { DomainBadgeComponent } from '../../../badges/domain-badge/domain-badge.component';
import { CommentListComponent } from '../comment-list/comment-list.component';

@Component({
    selector: 'app-comment-manager',
    templateUrl: './comment-manager.component.html',
    imports: [
        DomainBadgeComponent,
        CommentListComponent,
    ],
})
export class CommentManagerComponent implements OnInit {

    constructor(
        private readonly commentSvc: CommentService,
    ) {}

    ngOnInit(): void {
        // Poke the comment service to refresh the comment count
        this.commentSvc.refresh();
    }
}
