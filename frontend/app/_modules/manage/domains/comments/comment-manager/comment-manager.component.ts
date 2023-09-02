import { Component, OnInit } from '@angular/core';
import { CommentService } from '../../../_services/comment.service';

@Component({
    selector: 'app-comment-manager',
    templateUrl: './comment-manager.component.html',
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
