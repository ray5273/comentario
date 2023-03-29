import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-server-message',
    templateUrl: './server-message.component.html',
})
export class ServerMessageComponent {

    /** The message ID */
    @Input() messageId?: string;

    /** The error code, used if the ID isn't recognised. */
    @Input() errorCode?: number;
}
