import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-comment-list',
    templateUrl: './comment-list.component.html',
})
export class CommentListComponent {

    /**
     * Optional page ID to load comments for. If not provided, all comments for the current domain will be loaded.
     */
    @Input()
    pageId?: string;

}
