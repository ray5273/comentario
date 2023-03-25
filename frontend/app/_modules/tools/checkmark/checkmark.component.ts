import { Component, Input } from '@angular/core';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-checkmark',
    templateUrl: './checkmark.component.html',
    styleUrls: ['./checkmark.component.scss'],
})
export class CheckmarkComponent {

    /**
     * Value that controls the appearance of the checkmark: if truthy, the checkmark does appear, otherwise not.
     */
    @Input() value: any = true;

    // Icons
    readonly faCheck = faCheck;
}
