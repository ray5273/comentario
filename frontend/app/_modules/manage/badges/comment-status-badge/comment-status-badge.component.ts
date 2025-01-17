import { Component, Input } from '@angular/core';
import { Comment } from '../../../../../generated-api';

type CommentStatus = 'unknown' | 'deleted' | 'pending' | 'approved' | 'rejected';

@Component({
    selector: 'app-comment-status-badge',
    template: '',
    host: {
        '[class]':     'subtle ? CLASS_MAP_SUBTLE[status] : CLASS_MAP_NORMAL[status]',
        '[innerText]': 'TEXT_MAP[status]',
    },
})
export class CommentStatusBadgeComponent {

    /** Comment in question. */
    @Input({required: true})
    comment?: Comment;

    /** Whether to use 'subtle' colouring classes. */
    @Input()
    subtle = false;

    readonly TEXT_MAP: Record<CommentStatus, string> = {
        unknown:  '',
        deleted:  $localize`Deleted`,
        pending:  $localize`Pending`,
        approved: $localize`Approved`,
        rejected: $localize`Rejected`,
    };
    readonly CLASS_MAP_NORMAL: Record<CommentStatus, string> = {
        unknown:  '',
        deleted:  'badge bg-danger text-light',
        pending:  'badge bg-secondary text-light',
        approved: 'badge bg-success text-light',
        rejected: 'badge bg-warning text-light',
    };
    readonly CLASS_MAP_SUBTLE: Record<CommentStatus, string> = {
        unknown:  '',
        deleted:  'badge bg-danger-subtle text-muted',
        pending:  'badge bg-secondary-subtle text-muted',
        approved: 'badge bg-success-subtle text-muted',
        rejected: 'badge bg-warning-subtle text-muted',
    };

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
