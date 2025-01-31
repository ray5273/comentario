import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { CommentSort, TranslateFunc } from './models';

export class ThreadToolbar extends Wrap<HTMLDivElement> {

    private readonly countBar:      Wrap<HTMLDivElement>;
    private readonly sortBar:       Wrap<HTMLDivElement>;
    private readonly btnByScore?:   Wrap<HTMLButtonElement>;
    private readonly btnByTimeAsc:  Wrap<HTMLButtonElement>;
    private readonly btnByTimeDesc: Wrap<HTMLButtonElement>;

    constructor(
        private readonly t: TranslateFunc,
        private readonly onRssClick: (ref: Wrap<any>) => void,
        private readonly onSortChange: (cs: CommentSort) => void,
        private curSort: CommentSort | undefined,
        allowRss: boolean,
        allowByScore: boolean,
    ) {
        super(UIToolkit.div('thread-toolbar').element);
        this.append(
            // Thread buttons
            UIToolkit.div('thread-buttons')
                .append(allowRss && UIToolkit.button('RSS', btn => this.onRssClick(btn), 'btn-sm', 'btn-link')),
            // Comment count
            this.countBar = UIToolkit.div('comment-count'),
            // Sort buttons
            this.sortBar = UIToolkit.div('sort-buttons')
                .append(
                    allowByScore &&
                        (this.btnByScore =
                            UIToolkit.button(this.t('sortVotes'), () => this.setSort(this.curSort === 'sd' ? 'sa' : 'sd'), 'btn-sm', 'btn-link')
                                .append(UIToolkit.icon('caretDown').classes('ms-1'))),
                    this.btnByTimeAsc  = UIToolkit.button(this.t('sortOldest'), () => this.setSort('ta'), 'btn-sm', 'btn-link'),
                    this.btnByTimeDesc = UIToolkit.button(this.t('sortNewest'), () => this.setSort('td'), 'btn-sm', 'btn-link')));

        // Apply the initial sorting selection
        this.setSort(curSort);
    }

    /** Set the number of displayed comments. */
    set commentCount(n: number) {
        // Update the displayed comment count
        this.countBar.inner(n ? `${n} ${this.t('commentCount')}` : '');

        // Hide the count bar and the sort bar unless there are comments
        this.countBar.setClasses(!n, 'hidden');
        this.sortBar .setClasses(!n, 'hidden');
    }

    private setSort(cs: CommentSort | undefined) {
        const chg = this.curSort !== cs;

        // Save the set sort
        this.curSort = cs;

        // Update button appearance
        this.btnByScore  ?.setClasses(cs?.[0] === 's', 'btn-active').setClasses(cs === 'sa', 'sort-asc');
        this.btnByTimeAsc .setClasses(cs === 'ta', 'btn-active');
        this.btnByTimeDesc.setClasses(cs === 'td', 'btn-active');

        // If the sort has changed, call the change callback
        if (chg && cs) {
            this.onSortChange(cs);
        }
    }
}
