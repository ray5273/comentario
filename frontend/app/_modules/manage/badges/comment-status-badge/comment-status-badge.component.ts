import { Component, HostBinding, Input } from '@angular/core';
import { Comment } from '../../../../../generated-api';

type CommentStatus = 'unknown' | 'deleted' | 'pending' | 'approved' | 'rejected';

@Component({
    selector: 'app-comment-status-badge',
    template: '',
})
export class CommentStatusBadgeComponent {

    /** Comment in question. */
    @Input({required: true})
    comment?: Comment;

    /** Whether to use 'subtle' colouring classes. */
    @Input()
    subtle = false;

    static readonly TEXT_MAP: { [key in CommentStatus]: string } = {
        unknown:  '',
        deleted:  $localize`Deleted`,
        pending:  $localize`Pending`,
        approved: $localize`Approved`,
        rejected: $localize`Rejected`,
    };
    static readonly CLASS_MAP_NORMAL: { [key in CommentStatus]: string } = {
        unknown:  '',
        deleted:  'badge bg-danger text-light',
        pending:  'badge bg-secondary text-light',
        approved: 'badge bg-success text-light',
        rejected: 'badge bg-warning text-light',
    };
    static readonly CLASS_MAP_SUBTLE: { [key in CommentStatus]: string } = {
        unknown:  '',
        deleted:  'badge bg-danger-subtle text-muted',
        pending:  'badge bg-secondary-subtle text-muted',
        approved: 'badge bg-success-subtle text-muted',
        rejected: 'badge bg-warning-subtle text-muted',
    };

    @HostBinding()
    get class(): string {
        return this.subtle ?
            CommentStatusBadgeComponent.CLASS_MAP_SUBTLE[this.status] :
            CommentStatusBadgeComponent.CLASS_MAP_NORMAL[this.status];
    }

    @HostBinding()
    get innerText(): string {
        return CommentStatusBadgeComponent.TEXT_MAP[this.status];
    }

    get status(): CommentStatus {
        return !this.comment ?
            'unknown' :
            this.comment.isDeleted ?
                'deleted' :
                this.comment.isPending ?
                    'pending' :
                    this.comment.isApproved ? 'approved' : 'rejected';
    }
}
