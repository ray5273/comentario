import { Component, computed, input } from '@angular/core';

@Component({
    selector: 'app-server-message',
    templateUrl: './server-message.component.html',
})
export class ServerMessageComponent {

    /** The message ID. */
    readonly messageId = input<string>();

    /** The message text to display when messageId isn't provided. */
    readonly message = input<string>();

    /** The error code, used if the ID isn't recognised. */
    readonly errorCode = input<number>();

    /** Identifiable message ID (for testing purposes). */
    readonly id = computed(() => this.messageId() || this.errorCode());
}
