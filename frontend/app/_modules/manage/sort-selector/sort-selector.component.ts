import { Component, ContentChildren, Input, QueryList } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowDownShortWide, faArrowUpShortWide } from '@fortawesome/free-solid-svg-icons';
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
    @Input({required: true})
    sort?: Sort;

    @ContentChildren(SortPropertyComponent)
    items?: QueryList<SortPropertyComponent>;

    // Icons
    readonly faArrowDownShortWide = faArrowDownShortWide;
    readonly faArrowUpShortWide   = faArrowUpShortWide;

    /**
     * Handles a click on the sort button.
     */
    applyProperty(p: SortPropertyComponent) {
        this.sort?.apply(p.by);
    }
}
