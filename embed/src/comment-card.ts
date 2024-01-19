import { Wrap } from './element-wrap';
import {
    ANONYMOUS_ID,
    Comment,
    CommenterMap,
    CommentsGroupedById,
    CommentSort,
    CommentSortComparators,
    Principal,
    User,
    UUID,
} from './models';
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

            // Remove all option buttons
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
            this.eBody?.inner('(deleted)');
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
                                        Wrap.new('a')
                                            .attr({
                                                href:  `#${Wrap.idPrefix}${id}`,
                                                title: `${this._comment.createdTime} — Permalink`})
                                            .inner(Utils.timeAgo(ctx.curTimeMs, ms))))),
                // Card body
                this.eBody = UIToolkit.div('card-body'),
                // Options toolbar
                this.commentOptionsBar(ctx));

        // Expand toggler or spacer
        const hasChildren = this.children.hasChildren;
        this.eToggler = UIToolkit.div(hasChildren ? 'card-expand-toggler' : 'card-expand-spacer', `border-${bgColor}`);
        if (hasChildren) {
            this.eToggler.attr({role: 'button'}).click(() => this.collapse(!this.collapsed));
        }

        // Render a card
        this.classes('card')
            .append(
                this.eToggler,
                UIToolkit.div('card-expand-body')
                    .append(
                        // Card self
                        this.eCardSelf,
                        // Card's children (if any)
                        this.children));
    }

    /**
     * Return a wrapped options toolbar for a comment.
     */
    private commentOptionsBar(ctx: CommentRenderingContext): Wrap<HTMLDivElement> | null {
        if (this._comment.isDeleted) {
            return null;
        }
        const options = UIToolkit.div('options');
        const isModerator = ctx.principal && (ctx.principal.isSuperuser || ctx.principal.isOwner || ctx.principal.isModerator);
        const ownComment = ctx.principal && this._comment.userCreated === ctx.principal.id;

        // Left- and right-hand side of the options bar
        const left = UIToolkit.div('options-sub').appendTo(options);
        const right = UIToolkit.div('options-sub').appendTo(options);

        // Upvote / Downvote buttons and the score
        if (ctx.enableVoting) {
            left.append(
                this.btnUpvote = this.getOptionButton('upvote', null, () => ctx.onVote(this, this._comment.direction > 0 ? 0 : 1))
                    .attr(ownComment && {disabled: 'true'}),
                this.eScore = UIToolkit.div('score').attr({title: 'Comment score'}),
                this.btnDownvote = this.getOptionButton('downvote', null, () => ctx.onVote(this, this._comment.direction < 0 ? 0 : -1))
                    .attr(ownComment && {disabled: 'true'}));
        }

        // Reply button
        if (ctx.canAddComments) {
            this.btnReply = this.getOptionButton('reply', null, () => ctx.onReply(this)).appendTo(left);
        }

        // Approve/reject buttons
        if (isModerator && this._comment.isPending) {
            this.btnApprove = this.getOptionButton('approve', 'text-success', () => ctx.onModerate(this, true)).appendTo(right);
            this.btnReject  = this.getOptionButton('reject',  'text-warning', () => ctx.onModerate(this, false)).appendTo(right);
        }

        // Sticky toggle button (top-level comments only). The sticky status can only be changed after a full tree
        // reload
        const isSticky = this._comment.isSticky;
        if (!this._comment.parentId && (isSticky || isModerator)) {
            this.btnSticky = this.getOptionButton('sticky', null, () => ctx.onSticky(this))
                .setClasses(isSticky, 'is-sticky')
                .attr({
                    disabled: isModerator ? null : 'true',
                    title: isSticky ? (isModerator ? 'Unsticky' : 'This comment has been stickied') : 'Sticky',
                })
                .appendTo(right);
        }

        // Moderator or own comment
        if (isModerator || ownComment) {
            right.append(
                // Edit button
                this.btnEdit = this.getOptionButton('edit', null, () => ctx.onEdit(this)).appendTo(right),
                // Delete button
                this.btnDelete = this.getOptionButton('delete', 'text-danger', btn => this.deleteComment(btn, ctx)).appendTo(right));
        }
        return options;
    }

    private async deleteComment(btn: Wrap<any>, ctx: CommentRenderingContext) {
        // Confirm deletion
        if (await ConfirmDialog.run(ctx.root, {ref: btn, placement: 'bottom-end'}, 'Are you sure you want to delete this comment?')) {
            // Notify the callback
            ctx.onDelete(this);
        }
    }

    private collapse(c: boolean) {
        if (this.children?.ok) {
            this.collapsed = c;
            this.children
                .noClasses('fade-in', 'fade-out', !c && 'hidden')
                .on('animationend', ch => ch.classes(c && 'hidden'), true)
                .classes(c && 'fade-out', !c && 'fade-in');
            this.eToggler?.setClasses(c, 'collapsed');
        }
    }

    /**
     * Return a rendered, wrapped option button.
     * @param icon Name of the icon to put on the button.
     * @param cls Optional additional class.
     * @param onClick Button's click handler.
     */
    private getOptionButton(icon: 'approve' | 'delete' | 'downvote' | 'edit' | 'reject' | 'reply' | 'sticky' | 'upvote', cls?: string | null, onClick?: (btn: Wrap<HTMLButtonElement>) => void): Wrap<any> {
        let title: string;
        let svg: string;
        switch (icon) {
            case 'approve':
                title = 'Approve';
                svg = UIToolkit.svg(16, 16, '<path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>');
                break;
            case 'delete':
                title = 'Delete';
                svg = UIToolkit.svg(16, 16, '<path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>');
                break;
            case 'downvote':
                title = 'Downvote';
                svg = UIToolkit.svg(16, 16, '<path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"/>');
                break;
            case 'edit':
                title = 'Edit';
                svg = UIToolkit.svg(16, 16, '<path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>');
                break;
            case 'reject':
                title = 'Reject';
                svg = UIToolkit.svg(16, 16, '<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>');
                break;
            case 'reply':
                title = 'Reply';
                svg = UIToolkit.svg(16, 16, '<path d="M5.921 11.9 1.353 8.62a.72.72 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"/>');
                break;
            case 'sticky':
                title = 'Sticky';
                svg = UIToolkit.svg(16, 16, '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>');
                break;
            case 'upvote':
                title = 'Upvote';
                svg = UIToolkit.svg(16, 16, '<path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"/>');
                break;
        }
        return UIToolkit.button(svg, onClick, 'btn-link', 'btn-option', cls).attr({title});
    }
}
