import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-checkmark',
    templateUrl: './checkmark.component.html',
    styleUrls: ['./checkmark.component.scss'],
    imports: [
        FaIconComponent,
    ],
})
export class CheckmarkComponent {

    /** Value that controls the appearance of the checkmark: if truthy, the checkmark does appear, otherwise not. */
    readonly value = input<any>(true);

    // Icons
    readonly faCheck = faCheck;
}
