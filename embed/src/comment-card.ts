import { Wrap } from './element-wrap';
import { ANONYMOUS_ID, Comment, CommenterMap, CommentsGroupedById, CommentSort, CommentSortComparators, Principal, User, UUID } from './models';
import { UIToolkit } from './ui-toolkit';
import { Utils } from './utils';
import { ConfirmDialog } from './confirm-dialog';

export type CommentCardEventHandler = (c: CommentCard) => void;
export type CommentCardGetAvatarHandler = (user: User | undefined) => Wrap<any>;
export type CommentCardModerateEventHandler = (c: CommentCard, approve: boolean) => void;
export type CommentCardVoteEventHandler = (c: CommentCard, direction: -1 | 0 | 1) => void;

/**
 * Context for rendering comment trees.
 */
export interface CommentRenderingContext {
    /** Base API URL. */
    readonly apiUrl: string;
    /** The root element (for displaying popups). */
    readonly root: Wrap<any>;
    /** Map that links comment lists to their parent IDs. */
    readonly parentMap: CommentsGroupedById;
    /** Map of known commenters. */
    readonly commenters: CommenterMap;
    /** Optional logged-in principal. */
    readonly principal?: Principal;
    /** Current sorting. */
    readonly commentSort: CommentSort;
    /** Whether the user can add comments on this page. */
    readonly canAddComments: boolean;
    /** Whether users can delete own comments on this page. */
    readonly ownCommentDeletion: boolean;
    /** Whether moderators can delete others' comments on this page. */
    readonly modCommentDeletion: boolean;
    /** Whether users can edit own comments on this page. */
    readonly ownCommentEditing: boolean;
    /** Whether moderators can edit others' comments on this page. */
    readonly modCommentEditing: boolean;
    /** Current time in milliseconds. */
    readonly curTimeMs: number;
    /** Max comment nesting level. */
    readonly maxLevel: number;
    /** Whether voting on comments is enabled. */
    readonly enableVoting: boolean;

    // Events
    readonly onGetAvatar: CommentCardGetAvatarHandler;
    readonly onModerate:  CommentCardModerateEventHandler;
    readonly onDelete:    CommentCardEventHandler;
    readonly onEdit:      CommentCardEventHandler;
    readonly onReply:     CommentCardEventHandler;
    readonly onSticky:    CommentCardEventHandler;
    readonly onVote:      CommentCardVoteEventHandler;
}

/**
 * Comment card represents an individual comment in the UI.
 */
export class CommentCard extends Wrap<HTMLDivElement> {

    /** Card content container. Also used to host a edit-comment editor. */
    expandBody?: Wrap<HTMLDivElement>;

    /** Child cards container. Also used to host a reply editor. */
    children?: Wrap<HTMLDivElement>;

    private eNameWrap?: Wrap<HTMLDivElement>;
    private eScore?: Wrap<HTMLDivElement>;
    private eToggler?: Wrap<HTMLDivElement>;
    private eCardSelf?: Wrap<HTMLDivElement>;
    private eHeader?: Wrap<HTMLDivElement>;
    private eBody?: Wrap<HTMLDivElement>;
    private eModeratorBadge?: Wrap<HTMLSpanElement>;
    private ePendingBadge?: Wrap<HTMLSpanElement>;
    private eModNotice?: Wrap<HTMLDivElement>;
    private btnApprove?: Wrap<HTMLButtonElement>;
    private btnReject?: Wrap<HTMLButtonElement>;
    private btnDelete?: Wrap<HTMLButtonElement>;
    private btnDownvote?: Wrap<HTMLButtonElement>;
    private btnEdit?: Wrap<HTMLButtonElement>;
    private btnReply?: Wrap<HTMLButtonElement>;
    private btnSticky?: Wrap<HTMLButtonElement>;
    private btnUpvote?: Wrap<HTMLButtonElement>;
    private collapsed = false;

    constructor(
        private _comment: Comment,
        ctx: CommentRenderingContext,
        private readonly level: number,
    ) {
        super(UIToolkit.div().element);

        // Render the content
        this.render(ctx);

        // Update the card controls/text
        this.update();
        this.updateText();
    }

    /**
     * Render a branch of comments that all relate to the same given parent.
     */
    static renderChildComments(ctx: CommentRenderingContext, level: number, parentId?: UUID): CommentCard[] {
        // Fetch comments that have the given parent (or no parent, i.e. root comments, if parentId is undefined)
        const comments = ctx.parentMap[parentId ?? ''] || [];

        // Apply the chosen sorting, always keeping the sticky comment on top
        comments.sort((a, b) => {
            // Make sticky, non-deleted comment go first
            const ai = !a.isDeleted && a.isSticky ? -999999999 : 0;
            const bi = !b.isDeleted && b.isSticky ? -999999999 : 0;
            let i = ai-bi;

            // If both are (non)sticky, apply the standard sort
            if (i === 0) {
                i = CommentSortComparators[ctx.commentSort](a, b);
            }
            return i;
        });

        // Render child comments, if any
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return comments.map(c => new CommentCard(c, ctx, level));
    }

    get comment(): Comment {
        return this._comment;
    }

    set comment(c: Comment) {
        this._comment = c;
        this.update();
        this.updateText();
    }

    /**
     * Update comment controls according to the related comment's properties.
     */
    update() {
        const c = this._comment;

        // If the comment is deleted
        if (c.isDeleted) {
            // Add the deleted class
            this.eCardSelf?.classes('deleted');

            // Remove all tool buttons
            this.eScore?.remove();
            this.btnApprove?.remove();
            this.btnReject?.remove();
            this.btnDelete?.remove();
            this.btnDownvote?.remove();
            this.btnEdit?.remove();
            this.btnReply?.remove();
            this.btnSticky?.remove();
            this.btnUpvote?.remove();
            return;
        }
        this.setClasses(c.isDeleted, 'deleted');

        // Score
        this.eScore
            ?.inner(c.score?.toString() || '0')
            .setClasses(c.score > 0, 'upvoted').setClasses(c.score < 0, 'downvoted');
        this.btnUpvote?.setClasses(c.direction > 0, 'upvoted');
        this.btnDownvote?.setClasses(c.direction < 0, 'downvoted');

        // Pending approval
        const pending = this._comment.isPending;
        this.eCardSelf?.setClasses(pending, 'pending');
        if (!pending) {
            // If the comment is rejected
            this.eCardSelf?.setClasses(!this._comment.isApproved, 'rejected');

            // Remove the Pending badge and Approve/Reject buttons if the comment isn't pending
            this.ePendingBadge?.remove();
            this.ePendingBadge = undefined;
            this.btnApprove?.remove();
            this.btnApprove = undefined;
            this.btnReject?.remove();
            this.btnReject = undefined;

        // Add a Pending badge otherwise
        } else if (!this.ePendingBadge) {
            this.eNameWrap?.append(this.ePendingBadge = UIToolkit.badge('Pending', 'badge-pending'));
        }

        // Moderation notice
        let mn: string | undefined;
        if (c.isPending) {
            mn = 'This comment is awaiting moderator approval.';
        } else if (!c.isApproved) {
            mn = 'This comment was flagged as spam.';
        }
        if (mn) {
            // If there's something to display, make sure the notice element exists and appended to the header
            if (!this.eModNotice) {
                this.eModNotice = UIToolkit.div('moderation-notice').appendTo(this.eHeader!);
            }
            this.eModNotice.inner(mn);

        } else {
            // No moderation notice
            this.eModNotice?.remove();
            this.eModNotice = undefined;
        }
    }

    /**
     * Update the current comment's text.
     */
    private updateText() {
        if (this._comment.isDeleted) {
            this.eBody?.inner(
                this._comment.userCreated ?
                    this._comment.userCreated === this._comment.userDeleted ?
                        '(deleted by author)' :
                        '(deleted by a moderator)' :
                    '(deleted)');
        } else {
            this.eBody!.html(this._comment.html || '');
        }
    }

    /**
     * Render the content of the card.
     */
    private render(ctx: CommentRenderingContext): void {
        const id = this._comment.id;
        const commenter = this._comment.userCreated ? ctx.commenters[this._comment.userCreated] : undefined;

        // Pick a color for the commenter
        let bgColor = 'deleted';
        if (commenter) {
            bgColor = commenter.id === ANONYMOUS_ID ? 'anonymous' : commenter.colourIndex.toString();
            if (commenter.isModerator) {
                this.eModeratorBadge = UIToolkit.badge('Moderator', 'badge-moderator');
            }
        }

        // Render children
        this.children = UIToolkit.div('card-children', this.level >= ctx.maxLevel && 'card-children-unnest')
            // When children are collapsed, hide the element after the fade-out animation finished
            .animated(ch => ch.hasClass('fade-out') && ch.classes('hidden'))
            .append(...CommentCard.renderChildComments(ctx, this.level + 1, id));

        // Convert comment creation time to milliseconds
        const ms = new Date(this._comment.createdTime).getTime();

        // Card self
        this.eCardSelf = UIToolkit.div('card-self')
            // ID for highlighting/scrolling to
            .id(id)
            .append(
                // Card header
                this.eHeader = UIToolkit.div('card-header')
                    .append(
                        // Avatar
                        ctx.onGetAvatar(commenter),
                        // Name and subtitle
                        UIToolkit.div('name-container')
                            .append(
                                this.eNameWrap = UIToolkit.div('name-wrap')
                                    .append(
                                        // Name
                                        Wrap.new(commenter?.websiteUrl ? 'a' : 'div')
                                            .inner(commenter?.name ?? '[Deleted User]')
                                            .classes('name')
                                            .attr(commenter?.websiteUrl ?
                                                {href: commenter.websiteUrl, rel: 'nofollow noopener noreferrer'} :
                                                undefined),
                                        // Moderator badge
                                        this.eModeratorBadge),
                                // Subtitle
                                UIToolkit.div('subtitle')
                                    .append(
                                        // Permalink and the comment creation time
                                        UIToolkit.a(Utils.timeAgo(ctx.curTimeMs, ms), `#${Wrap.idPrefix}${id}`)
                                            .attr({title: `${this._comment.createdTime} — Permalink`})))),
                // Card body
                this.eBody = UIToolkit.div('card-body'),
                // Comment toolbar
                this.commentToolbar(ctx));

        // Expand toggler or spacer
        const hasChildren = this.children.hasChildren;
        this.eToggler = UIToolkit.div(hasChildren ? 'card-expand-toggler' : 'card-expand-spacer', `border-${bgColor}`);
        if (hasChildren) {
            this.eToggler.attr({role: 'button'}).click(() => this.collapse(!this.collapsed));
            this.updateExpandToggler();
        }

        // Render a card
        this.classes('card')
            .append(
                this.eToggler,
                this.expandBody = UIToolkit.div('card-expand-body')
                    .append(
                        // Card self
                        this.eCardSelf,
                        // Card's children (if any)
                        this.children));
    }

    /**
     * Return a toolbar for a comment.
     */
    private commentToolbar(ctx: CommentRenderingContext): Wrap<HTMLDivElement> | null {
        if (this._comment.isDeleted) {
            return null;
        }
        const toolbar = UIToolkit.div('toolbar');
        const isModerator = ctx.principal && (ctx.principal.isSuperuser || ctx.principal.isOwner || ctx.principal.isModerator);
        const ownComment = ctx.principal && this._comment.userCreated === ctx.principal.id;

        // Left- and right-hand side of the toolbar
        const left = UIToolkit.div('toolbar-section').appendTo(toolbar);
        const right = UIToolkit.div('toolbar-section').appendTo(toolbar);

        // Upvote / Downvote buttons and the score
        if (ctx.enableVoting) {
            left.append(
                this.btnUpvote = UIToolkit.iconButton('arrowUp', 'Upvote', () => ctx.onVote(this, this._comment.direction > 0 ? 0 : 1), 'btn-link')
                    .attr(ownComment && {disabled: 'true'}),
                this.eScore = UIToolkit.div('score').attr({title: 'Comment score'}),
                this.btnDownvote = UIToolkit.iconButton('arrowDown', 'Downvote', () => ctx.onVote(this, this._comment.direction < 0 ? 0 : -1), 'btn-link')
                    .attr(ownComment && {disabled: 'true'}));
        }

        // Reply button
        if (ctx.canAddComments) {
            this.btnReply = UIToolkit.iconButton('reply', 'Reply', () => ctx.onReply(this), 'btn-link').appendTo(left);
        }

        // Approve/reject buttons
        if (isModerator && this._comment.isPending) {
            this.btnApprove = UIToolkit.iconButton('check', 'Approve', () => ctx.onModerate(this, true),  'btn-link', 'text-success').appendTo(right);
            this.btnReject  = UIToolkit.iconButton('times', 'Reject',  () => ctx.onModerate(this, false), 'btn-link', 'text-warning').appendTo(right);
        }

        // Sticky toggle button (top-level comments only). The sticky status can only be changed after a full tree
        // reload
        const isSticky = this._comment.isSticky;
        if (!this._comment.parentId && (isSticky || isModerator)) {
            this.btnSticky = UIToolkit.iconButton(
                'star',
                isSticky ? (isModerator ? 'Unsticky' : 'Sticky comment') : 'Sticky',
                () => ctx.onSticky(this),
                'btn-link',
            )
                .setClasses(isSticky, 'is-sticky')
                .attr({disabled: isModerator ? null : 'true'})
                .appendTo(right);
        }

        // Edit button: when enabled
        if (isModerator && ctx.modCommentEditing || ownComment && ctx.ownCommentEditing) {
            this.btnEdit = UIToolkit.iconButton('pencil', 'Edit', () => ctx.onEdit(this), 'btn-link').appendTo(right);
        }

        // Delete button: when enabled
        if (isModerator && ctx.modCommentDeletion || ownComment && ctx.ownCommentDeletion) {
            this.btnDelete = UIToolkit.iconButton('bin', 'Delete', btn => this.deleteComment(btn, ctx), 'btn-link', 'text-danger').appendTo(right);
        }
        return toolbar;
    }

    private async deleteComment(btn: Wrap<any>, ctx: CommentRenderingContext) {
        // Confirm deletion
        if (await ConfirmDialog.run(ctx.root, {ref: btn, placement: 'bottom-end'}, 'Are you sure you want to delete this comment?')) {
            // Notify the callback
            ctx.onDelete(this);
        }
    }

    /**
     * Collapse or expand the card's children.
     * @param c Whether to expand (false) or collapse (true) the child comments.
     * @private
     */
    private collapse(c: boolean) {
        if (!this.children?.ok) {
            return;
        }

        this.collapsed = c;

        // Animate children expand/collapse
        this.children
            .noClasses('fade-in', 'fade-out', !c && 'hidden')
            .classes(c && 'fade-out', !c && 'fade-in');

        // Update the toggler's state
        this.updateExpandToggler();
    }

    /**
     * Update the expand toggler's state.
     * @private
     */
    private updateExpandToggler() {
        if (this.children?.ok) {
            this.eToggler?.setClasses(this.collapsed, 'collapsed').attr({title: this.collapsed ? 'Expand children' : 'Collapse children'});
        }
    }
}
