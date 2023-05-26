import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { sortingProps, CommentSort } from './models';

export class SortBar extends Wrap<HTMLDivElement> {

    private readonly buttons: { sp: CommentSort; btn: Wrap<HTMLAnchorElement>; }[] = [];

    constructor(
        private readonly onChange: (sp: CommentSort) => void,
        initialSort: CommentSort,
    ) {
        super(UIToolkit.div('sort-policy-buttons-container').element);

        // Create sorting buttons
        const cont = UIToolkit.div('sort-policy-buttons').appendTo(this);
        Object.keys(sortingProps).forEach(sp =>
            this.buttons.push({
                sp: sp as CommentSort,
                btn: Wrap.new('a')
                    .classes('sort-policy-button')
                    .inner(sortingProps[sp as CommentSort].label)
                    .click(() => this.setSortPolicy(sp as CommentSort, true))
                    .appendTo(cont),
            }));

        // Apply the initial sorting selection
        this.setSortPolicy(initialSort, false);
    }

    private setSortPolicy(sp: CommentSort, callOnChange: boolean) {
        this.buttons.forEach(b => b.btn.setClasses(b.sp === sp, 'sort-policy-button-selected'));
        if (callOnChange) {
            this.onChange(sp);
        }
    }
}
