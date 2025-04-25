import { Component, computed, input } from '@angular/core';
import { Comment } from '../../../../../generated-api';

type CommentStatus = 'unknown' | 'deleted' | 'pending' | 'approved' | 'rejected';

@Component({
    selector: 'app-comment-status-badge',
    template: '',
    host: {
        '[class]':     'classes()',
        '[innerText]': 'innerText()',
    },
})
export class CommentStatusBadgeComponent {

    /** Comment in question. */
    comment = input<Comment>();

    /** Whether to use 'subtle' colouring classes. */
    subtle = input(false);

    /** Comment status, computed from the provided comment. */
    status = computed<CommentStatus>(() => {
        const c = this.comment();
        return !c ?
            'unknown' :
            c.isDeleted ?
                'deleted' :
                c.isPending ?
                    'pending' :
                    c.isApproved ? 'approved' : 'rejected';
    });

    /** Badge classes. */
    classes = computed<string>(() => this.subtle() ?
        CommentStatusBadgeComponent.CLASS_MAP_SUBTLE[this.status()] :
        CommentStatusBadgeComponent.CLASS_MAP_NORMAL[this.status()]);

    /** Badge text. */
    innerText = computed<string>(() => CommentStatusBadgeComponent.TEXT_MAP[this.status()]);

    static readonly TEXT_MAP: Record<CommentStatus, string> = {
        unknown:  '',
        deleted:  $localize`Deleted`,
        pending:  $localize`Pending`,
        approved: $localize`Approved`,
        rejected: $localize`Rejected`,
    };
    static readonly CLASS_MAP_NORMAL: Record<CommentStatus, string> = {
        unknown:  '',
        deleted:  'badge bg-danger text-light',
        pending:  'badge bg-secondary text-light',
        approved: 'badge bg-success text-light',
        rejected: 'badge bg-warning text-light',
    };
    static readonly CLASS_MAP_SUBTLE: Record<CommentStatus, string> = {
        unknown:  '',
        deleted:  'badge bg-danger-subtle text-muted',
        pending:  'badge bg-secondary-subtle text-muted',
        approved: 'badge bg-success-subtle text-muted',
        rejected: 'badge bg-warning-subtle text-muted',
    };
}
