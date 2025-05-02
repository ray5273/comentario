import { Component, input } from '@angular/core';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

@Component({
    selector: 'app-info-block',
    templateUrl: './info-block.component.html',
    imports: [
        FaIconComponent,
    ],
    styleUrls: ['./info-block.component.scss'],
})
export class InfoBlockComponent {

    /** Icon to display to the info text. If null/undefined, none will be displayed. */
    readonly icon = input<IconProp | null | undefined>(faLightbulb);
}
