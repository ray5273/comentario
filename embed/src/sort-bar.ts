import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { CommentSort } from './models';

export class SortBar extends Wrap<HTMLDivElement> {

    private readonly btnByScore?:   Wrap<HTMLAnchorElement>;
    private readonly btnByTimeAsc:  Wrap<HTMLAnchorElement>;
    private readonly btnByTimeDesc: Wrap<HTMLAnchorElement>;

    constructor(
        private readonly onChange: (cs: CommentSort) => void,
        private curSort: CommentSort,
        allowByScore: boolean,
    ) {
        super(UIToolkit.div('sort-buttons-container').element);

        // Create sorting buttons
        const cont = UIToolkit.div('sort-buttons').appendTo(this);
        if (allowByScore) {
            this.btnByScore = this.addBtn('', () => this.setSort(this.curSort === 'sd' ? 'sa' : 'sd'), cont);
        }
        this.btnByTimeAsc  = this.addBtn('Oldest', () => this.setSort('ta'), cont);
        this.btnByTimeDesc = this.addBtn('Newest', () => this.setSort('td'), cont);

        // Apply the initial sorting selection
        this.setSort(curSort);
    }

    private addBtn(label: string, onClick: () => void, parent: Wrap<any>): Wrap<HTMLAnchorElement> {
        return Wrap.new('a').classes('sort-button').inner(label).click(onClick).appendTo(parent);
    }

    private setSort(cs: CommentSort) {
        const chg = this.curSort !== cs;

        // Save the set sort
        this.curSort = cs;

        // Update button appearance
        this.btnByScore
            ?.inner(cs === 'sa' ? 'Votes ⯅' : 'Votes ⯆')
            .setClasses(cs === 'sd' || cs === 'sa', 'sort-button-selected');
        this.btnByTimeAsc .setClasses(cs === 'ta', 'sort-button-selected');
        this.btnByTimeDesc.setClasses(cs === 'td', 'sort-button-selected');

        // If the sort has changed, call the change callback
        if (chg) {
            this.onChange(cs);
        }
    }
}
