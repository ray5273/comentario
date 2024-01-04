import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { CommentSort } from './models';

export class SortBar extends Wrap<HTMLDivElement> {

    private readonly btnByScore?:   Wrap<HTMLButtonElement>;
    private readonly btnByTimeAsc:  Wrap<HTMLButtonElement>;
    private readonly btnByTimeDesc: Wrap<HTMLButtonElement>;

    constructor(
        private readonly onChange: (cs: CommentSort) => void,
        private curSort: CommentSort,
        allowByScore: boolean,
    ) {
        super(UIToolkit.div('sort-bar').element);

        // Create sorting buttons
        UIToolkit.div('sort-buttons').appendTo(this)
            .append(
                allowByScore &&
                    (this.btnByScore = UIToolkit.button(
                        // eslint-disable-next-line prefer-template
                        'Votes' + UIToolkit.svgCaretDown(),
                        () => this.setSort(this.curSort === 'sd' ? 'sa' : 'sd'),
                        'btn-sm', 'btn-link')),
                this.btnByTimeAsc  = UIToolkit.button('Oldest', () => this.setSort('ta'), 'btn-sm', 'btn-link'),
                this.btnByTimeDesc = UIToolkit.button('Newest', () => this.setSort('td'), 'btn-sm', 'btn-link'));

        // Apply the initial sorting selection
        this.setSort(curSort);
    }

    private setSort(cs: CommentSort) {
        const chg = this.curSort !== cs;

        // Save the set sort
        this.curSort = cs;

        // Update button appearance
        this.btnByScore  ?.setClasses(cs[0] === 's', 'btn-active').setClasses(cs === 'sa', 'sort-asc');
        this.btnByTimeAsc .setClasses(cs === 'ta', 'btn-active');
        this.btnByTimeDesc.setClasses(cs === 'td', 'btn-active');

        // If the sort has changed, call the change callback
        if (chg) {
            this.onChange(cs);
        }
    }
}
