import { Wrap } from './element-wrap';
import {
    ANONYMOUS_ID, AsyncProcWithArg,
    Comment,
    CommenterMap,
    CommentSort,
    CommentSortComparators,
    Principal,
    TranslateFunc,
    User,
    UUID,
} from './models';
import { UIToolkit } from './ui-toolkit';
import { Utils } from './utils';
import { ConfirmDialog } from './confirm-dialog';

export type CommentCardEventHandler = (c: CommentCard) => void;
export type CommentCardGetAvatarHandler = (user: User | undefined) => Wrap<any>;
export type CommentCardModerateEventHandler = (c: CommentCard, approve: boolean) => Promise<void>;
export type CommentCardVoteEventHandler = (c: CommentCard, direction: -1 | 0 | 1) => Promise<void>;

/**
 * Extension of Comment that can hold a link to the card associated with the comment.
 */
export interface CommentWithCard extends Comment {
    /** Reference to the card holding the comment. */
    card?: CommentCard;
}

/**
 * Map of comment lists, indexed by their parent's ID.
 */
export class CommentParentMap {

    /** Internal data object, a map of lists of comments, grouped by their parentId. */
    private _data?: Record<UUID, CommentWithCard[]>;

    /**
     * Return the total renderable number of comments in the map, not taking any orphans into account.
     */
    get commentCount(): number {
        return this.recursiveCount('');
    }

    /**
     * Add the given comment to the map.
     */
    add(c: Comment) {
        this._data ||= {};

        // Map root ID to an empty string
        const pid = c.parentId ?? '';
        if (pid in this._data) {
            this._data[pid].push(c);
        } else {
            this._data[pid] = [c];
        }
    }

    /**
     * Remove the given comment from the map.
     */
    remove(c: Comment) {
        if (this._data) {
            // Delete the comment as parent, including all children
            delete this._data[c.id];

            // Delete the comment itself from the parentMap's list
            const pl = this._data[c.parentId ?? ''];
            const idx = pl.indexOf(c);
            if (idx >= 0) {
                pl.splice(idx, 1);
            }
        }
    }

    /**
     * Return a list of comments for the given parentId. If parentId wasn't found, return an empty list and, optionally,
     * update the map.
     * @param parentId Parent ID to return a list for.
     * @param allowUpdate Defines whether the map must be updated if parentId wasn't found (by storing an empty list).
     */
    getListFor(parentId: UUID | null | undefined, allowUpdate: boolean): CommentWithCard[] {
        const pid = parentId ?? '';
        if (allowUpdate && (!this._data || !(pid in this._data))) {
            this._data ||= {};
            this._data[pid] = [];
        }
        return this._data?.[pid] || [];
    }

    /**
     * Find and return a comment by its ID, or undefined if not found.
     * @param id ID to search for.
     */
    findById(id: UUID): CommentWithCard | undefined {
        let fc: CommentWithCard | undefined;
        if (this._data) {
            // Iterate all lists, and then each list to find the comment
            Object.values(this._data).find(l => fc = l.find(c => c.id === id));
        }
        return fc;
    }

    /**
     * Empty and refill the map from the given comment list, grouping them in the process.
     * @param comments Input comment list.
     */
    refill(comments: Comment[] | undefined) {
        this._data = comments?.reduce(
            (m, c) => {
                const pid = c.parentId ?? '';
                if (pid in m) {
                    m[pid].push(c);
                } else {
                    m[pid] = [c];
                }
                return m;
            },
            {} as Exclude<typeof this._data, undefined>);
    }

    /**
     * Make a clone of the original comment, replacing the provided properties, and replace that comment in the map
     * based on its ID and parent ID.
     * @param id Comment ID.
     * @param parentId Comment parent ID.
     * @param props Property overrides for the new clone.
     */
    replaceComment(id: string, parentId: string | null | undefined, props: Omit<Partial<Comment>, 'parentId' | 'id'>): CommentWithCard {
        // Try to find the comment in the map
        const list = this.getListFor(parentId, false);
        const idx = list.findIndex(c => c.id === id);
        const comment = idx >= 0 ? list[idx] : undefined;

        // Make a clone of the comment, overriding any property in props
        const cc = {...comment, ...props} as CommentWithCard;

        // Replace the comment instance in the appropriate list in the parentIdMap
        if (idx >= 0) {
            list![idx] = cc;
        }
        return cc;
    }

    /**
     * Return the total count of the comments for the given parent comment ID, recursively diving into child lists.
     * @param parentId Parent comment ID to count children for.
     * @private
     */
    private recursiveCount(parentId: string): number {
        // Fetch the child list
        const list = this._data?.[parentId];
        let n = list?.length ?? 0;

        // Recursively count each list's comments children
        list?.forEach(c => n += this.recursiveCount(c.id));
        return n;
    }
}

/**
 * Context for rendering comment trees.
 */
export interface CommentRenderingContext {
    /** The root element (for displaying popups). */
    readonly root: Wrap<any>;
    /** Map that links comment lists to their parent IDs. */
    readonly parentMap: CommentParentMap;
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
    /** Max comment nesting level. */
    readonly maxLevel: number;
    /** Whether voting on comments is enabled. */
    readonly enableVoting: boolean;
    /** i18n translation function. */
    readonly t: TranslateFunc;

    // Events
    readonly onGetAvatar: CommentCardGetAvatarHandler;
    readonly onModerate:  CommentCardModerateEventHandler;
    readonly onDelete:    AsyncProcWithArg<CommentCard>;
    readonly onEdit:      CommentCardEventHandler;
    readonly onReply:     CommentCardEventHandler;
    readonly onSticky:    AsyncProcWithArg<CommentCard>;
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
    private eSubtitleLink?: Wrap<HTMLAnchorElement>;
    private btnApprove?: Wrap<HTMLButtonElement>;
    private btnReject?: Wrap<HTMLButtonElement>;
    private btnDelete?: Wrap<HTMLButtonElement>;
    private btnDownvote?: Wrap<HTMLButtonElement>;
    private btnEdit?: Wrap<HTMLButtonElement>;
    private btnReply?: Wrap<HTMLButtonElement>;
    private btnSticky?: Wrap<HTMLButtonElement>;
    private btnUpvote?: Wrap<HTMLButtonElement>;
    private collapsed = false;
    private isModerator = false;

    /** Localisation function (mapped to the I18n service). */
    private readonly t: TranslateFunc;

    constructor(
        private _comment: CommentWithCard,
        ctx: CommentRenderingContext,
        readonly level: number,
    ) {
        super(UIToolkit.div().element);
        this._comment.card = this;
        this.t = ctx.t;

        // Render the content
        this.render(ctx);

        // Update the card
        this.update();
    }

    /**
     * Render a branch of comments that all relate to the same given parent.
     */
    static renderChildComments(ctx: CommentRenderingContext, level: number, parentId?: UUID): CommentCard[] {
        // Fetch comments that have the given parent (or no parent, i.e. root comments, if parentId is undefined)
        const comments = ctx.parentMap.getListFor(parentId, false);

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
        return comments.map(c => new CommentCard(c, ctx, level));
    }

    get comment(): Comment {
        return this._comment;
    }

    set comment(c: Comment) {
        // Release any existing card reference on the old comment
        this._comment.card = undefined;

        // Store the new comment and reference the card from it
        this._comment = c;
        this._comment.card = this;

        // Update the card
        this.update();
    }

    /**
     * Play a short animation on the card background to indicate it's been updated.
     */
    blink() {
        this.eCardSelf?.classes('bg-blink').animated(c => c.noClasses('bg-blink'));
    }

    /**
     * Update comment controls according to the related comment's properties.
     */
    update() {
        const c = this._comment;

        // If the comment is deleted
        if (c.isDeleted) {
            this.updateAsDeleted();

        // Update card elements
        } else {
            this.updateVoteScore(c.score, c.direction);
            this.updateStatus(c.isPending, c.isApproved);
            this.updateSticky(c.isSticky);
            this.updateModerationNotice(c.isPending, c.isApproved);
            this.updateText(c.html);
        }

        // Update comment metadata text
        this.updateSubtitle(c);
    }

    /**
     * Render the content of the card.
     */
    private render(ctx: CommentRenderingContext): void {
        const c = this._comment;
        const id = c.id;
        const commenter = c.userCreated ? ctx.commenters[c.userCreated] : undefined;

        // Pick a color for the commenter
        let bgColor = 'deleted';
        if (commenter) {
            bgColor = commenter.id === ANONYMOUS_ID ? 'anonymous' : commenter.colourIndex.toString();
            if (commenter.isModerator) {
                this.eModeratorBadge = UIToolkit.badge(this.t('statusModerator'), 'badge-moderator');
            }
        }

        // Render children
        this.children = UIToolkit.div('card-children', this.level >= ctx.maxLevel && 'card-children-unnest')
            // When children are collapsed, hide the element after the fade-out animation finished
            .animated(ch => ch.hasClass('fade-out') && ch.classes('hidden'))
            .append(...CommentCard.renderChildComments(ctx, this.level + 1, id));

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
                                            .inner(c.authorName || commenter?.name || `[${this.t('statusDeletedUser')}]`)
                                            .classes('name')
                                            .attr(commenter?.websiteUrl ?
                                                {href: commenter.websiteUrl, rel: 'nofollow noopener noreferrer'} :
                                                undefined),
                                        // Moderator badge
                                        this.eModeratorBadge),
                                // Subtitle
                                UIToolkit.div('subtitle')
                                    // Permalink to the comment, with creation/editing metadata
                                    .append(this.eSubtitleLink = Wrap.new('a').attr({href: `#${Wrap.idPrefix}${id}`})))),
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
        this.isModerator = !!ctx.principal && (ctx.principal.isSuperuser || ctx.principal.isOwner || ctx.principal.isModerator);
        const ownComment = ctx.principal && this._comment.userCreated === ctx.principal.id;

        // Left- and right-hand side of the toolbar
        const left = UIToolkit.div('toolbar-section').appendTo(toolbar);
        const right = UIToolkit.div('toolbar-section').appendTo(toolbar);

        // Upvote / Downvote buttons and the score
        if (ctx.enableVoting) {
            left.append(
                this.btnUpvote = UIToolkit.toolButton('arrowUp', this.t('actionUpvote'), btn => btn.spin(() => ctx.onVote(this, this._comment.direction > 0 ? 0 : 1))).disabled(ownComment),
                this.eScore = UIToolkit.div('score').attr({title: this.t('commentScore')}),
                this.btnDownvote = UIToolkit.toolButton('arrowDown', this.t('actionDownvote'), btn => btn.spin(() => ctx.onVote(this, this._comment.direction < 0 ? 0 : -1))).disabled(ownComment));
        }

        // Reply button
        if (ctx.canAddComments) {
            this.btnReply = UIToolkit.toolButton('reply', this.t('actionReply'), () => ctx.onReply(this)).appendTo(left);
        }

        // Approve/reject buttons
        if (this.isModerator && this._comment.isPending) {
            this.btnApprove = UIToolkit.toolButton('check', this.t('actionApprove'), btn => btn.spin(() => ctx.onModerate(this, true)),  'text-success').appendTo(right);
            this.btnReject  = UIToolkit.toolButton('times', this.t('actionReject'),  btn => btn.spin(() => ctx.onModerate(this, false)), 'text-warning').appendTo(right);
        }

        // Sticky toggle button (top-level comments only)
        if (!this._comment.parentId) {
            this.btnSticky = UIToolkit.toolButton('star', '', btn => btn.spin(() => ctx.onSticky(this)))
                .disabled(!this.isModerator)
                .appendTo(right);
        }

        // Edit button: when enabled
        if (this.isModerator && ctx.modCommentEditing || ownComment && ctx.ownCommentEditing) {
            this.btnEdit = UIToolkit.toolButton('pencil', this.t('actionEdit'), () => ctx.onEdit(this)).appendTo(right);
        }

        // Delete button: when enabled
        if (this.isModerator && ctx.modCommentDeletion || ownComment && ctx.ownCommentDeletion) {
            this.btnDelete = UIToolkit.toolButton('bin', this.t('actionDelete'), btn => this.deleteComment(btn, ctx), 'text-danger').appendTo(right);
        }
        return toolbar;
    }

    private async deleteComment(btn: Wrap<HTMLButtonElement>, ctx: CommentRenderingContext) {
        // Confirm deletion
        if (await ConfirmDialog.run(this.t, ctx.root, {ref: btn, placement: 'bottom-end'}, this.t('confirmCommentDeletion'))) {
            // Notify the callback
            await btn.spin(() => ctx.onDelete(this));
        }
    }

    /**
     * Collapse or expand the card's children.
     * @param c Whether to expand (false) or collapse (true) the child comments.
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
     * Make up the comment card for a deleted comment.
     */
    private updateAsDeleted() {
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

        // Update the card text
        this.eBody?.inner(`(${this.t('statusDeleted')})`);
    }

    /**
     * Update the expand toggler's state.
     */
    private updateExpandToggler() {
        if (this.children?.ok) {
            this.eToggler
                ?.setClasses(this.collapsed, 'collapsed')
                .attr({title: this.t(this.collapsed ? 'actionExpandChildren' : 'actionCollapseChildren')});
        }
    }

    /**
     * Update the card's score and voting buttons.
     */
    private updateVoteScore(score: number, direction: number) {
        this.eScore
            ?.inner(score.toString() || '0')
            .setClasses(score > 0, 'upvoted').setClasses(score < 0, 'downvoted');
        this.btnUpvote?.setClasses(direction > 0, 'upvoted');
        this.btnDownvote?.setClasses(direction < 0, 'downvoted');
    }

    /**
     * Update the card according to the comment's status.
     */
    private updateStatus(isPending: boolean, isApproved: boolean) {
        this.eCardSelf?.setClasses(isPending, 'pending');
        if (!isPending) {
            // If the comment is rejected
            this.eCardSelf?.setClasses(!isApproved, 'rejected');

            // Remove the Pending badge and Approve/Reject buttons if the comment isn't pending
            this.ePendingBadge?.remove();
            this.ePendingBadge = undefined;
            this.btnApprove?.remove();
            this.btnApprove = undefined;
            this.btnReject?.remove();
            this.btnReject = undefined;

        // Comment is pending: add a Pending badge
        } else if (!this.ePendingBadge) {
            this.eNameWrap?.append(this.ePendingBadge = UIToolkit.badge(this.t('statusPending'), 'badge-pending'));
        }
    }

    /**
     * Update the card according to the comment's stickiness.
     */
    private updateSticky(isSticky: boolean) {
        this.btnSticky
            ?.attr({title: this.t(isSticky ? (this.isModerator ? 'actionUnsticky' : 'stickyComment') : 'actionSticky')})
            .setClasses(isSticky, 'is-sticky')
            .setClasses(!this.isModerator && !isSticky, 'hidden');
    }

    /**
     * Update the card's moderation notice.
     */
    private updateModerationNotice(isPending: boolean, isApproved: boolean) {
        let notice = '';
        if (isPending) {
            notice = this.t('commentIsPending');
        } else if (!isApproved) {
            notice = this.t('commentIsRejected');
        }
        if (notice) {
            // If there's something to display, make sure the notice element exists and appended to the header
            if (!this.eModNotice) {
                this.eModNotice = UIToolkit.div('moderation-notice').appendTo(this.eHeader!);
            }
            this.eModNotice.inner(notice);

        } else {
            // No moderation notice
            this.eModNotice?.remove();
            this.eModNotice = undefined;
        }
    }

    /**
     * Update the current comment's creation/deletion/editing times.
     */
    private updateSubtitle(c: Comment) {
        const curTime     = new Date().getTime();
        const createdDate = Utils.parseDate(c.createdTime);

        this.eSubtitleLink!
            // Replace the link content
            .inner('')
            .append(
                // Comment creation time text
                UIToolkit.span(Utils.timeAgo(this.t, curTime, createdDate?.getTime())).attr({title: createdDate?.toLocaleString()}));

        /** Add a '[done] by [user] [time] ago' message to the subtitle, if the time value is provided. */
        const addTime = (timeStr: string | undefined, byId: UUID | undefined, idByAuthor: string, idByMod: string) => {
            const date = Utils.parseDate(timeStr);
            if (date && c.userCreated) {
                this.eSubtitleLink!.append(
                    // "by …"
                    UIToolkit.span(', ' + this.t(byId === c.userCreated ? idByAuthor : idByMod) + ' '),
                    // Time ago
                    UIToolkit.span(Utils.timeAgo(this.t, curTime, date.getTime())).attr({title: date.toLocaleString()}));
            }
        };

        // If the comment is deleted
        if (c.isDeleted) {
            // Comment deletion time text, if present
            addTime(c.deletedTime, c.userDeleted, 'statusDeletedByAuthor', 'statusDeletedByModerator');

        } else {
            // Comment edited time text, if present
            addTime(c.editedTime, c.userEdited, 'statusEditedByAuthor', 'statusEditedByModerator');
        }
    }

    /**
     * Update the current comment's text.
     */
    private updateText(html?: string) {
        this.eBody!.html(html || '');
    }
}
