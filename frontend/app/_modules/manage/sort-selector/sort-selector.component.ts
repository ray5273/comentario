import { Component, ContentChildren, input, QueryList } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowDownShortWide, faArrowUpShortWide, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Sort } from '../_models/sort';
import { SortPropertyComponent } from './sort-property/sort-property.component';

@Component({
    selector: 'app-sort-selector',
    templateUrl: './sort-selector.component.html',
    imports: [
        FaIconComponent,
        NgbDropdownModule,
    ],
})
export class SortSelectorComponent {

    /** Sort instance specifying the sort options. */
    readonly sort = input.required<Sort>();

    @ContentChildren(SortPropertyComponent)
    readonly items?: QueryList<SortPropertyComponent>;

    // Icons
    readonly faArrowDownShortWide = faArrowDownShortWide;
    readonly faArrowUpShortWide   = faArrowUpShortWide;

    /** Icon of the currently selected item. */
    get itemIcon(): IconDefinition {
        return this.sort()?.descending ? this.faArrowUpShortWide : this.faArrowDownShortWide;
    }

    /** Title of the currently selected item. */
    get itemTitle(): string {
        const s = this.sort();
        return s && this.items?.find(i => i.by() === s.property)?.label() || '';
    }

    /**
     * Handles a click on the sort button.
     */
    applyProperty(p: SortPropertyComponent) {
        this.sort()?.apply(p.by());
    }
}
