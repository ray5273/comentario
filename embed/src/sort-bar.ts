import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { sortingProps, CommentSort } from './models';

export class SortBar extends Wrap<HTMLDivElement> {

    private readonly buttons: { cs: CommentSort; btn: Wrap<HTMLAnchorElement>; }[] = [];

    constructor(
        private readonly onChange: (cs: CommentSort) => void,
        initialSort: CommentSort,
    ) {
        super(UIToolkit.div('sort-policy-buttons-container').element);

        // Create sorting buttons
        const cont = UIToolkit.div('sort-policy-buttons').appendTo(this);
        Object.keys(sortingProps).forEach(cs =>
            this.buttons.push({
                cs: cs as CommentSort,
                btn: Wrap.new('a')
                    .classes('sort-policy-button')
                    .inner(sortingProps[cs as CommentSort].label)
                    .click(() => this.setSort(cs as CommentSort, true))
                    .appendTo(cont),
            }));

        // Apply the initial sorting selection
        this.setSort(initialSort, false);
    }

    private setSort(cs: CommentSort, callOnChange: boolean) {
        this.buttons.forEach(b => b.btn.setClasses(b.cs === cs, 'sort-policy-button-selected'));
        if (callOnChange) {
            this.onChange(cs);
        }
    }
}
