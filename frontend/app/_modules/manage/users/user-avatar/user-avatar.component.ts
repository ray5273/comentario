import { Component, Inject, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Configuration } from '../../../../../generated-api';

@Component({
    selector: 'app-user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
})
export class UserAvatarComponent implements OnChanges, OnDestroy {

    /** Whether the user has an avatar image. */
    @Input({required: true})
    hasAvatar: boolean | null | undefined = false;

    /** ID of the user to display an avatar for. */
    @Input({required: true})
    userId?: string;

    /** Name of the user. */
    @Input({required: true})
    userName?: string;

    _src?: SafeResourceUrl;
    urlOverride?: string | null;

    constructor(
        @Inject(Configuration) private readonly API_CONFIG: Configuration,
        private readonly sanitizer: DomSanitizer,
    ) {}

    /**
     * Avatar override. If set, will take precedence over the user's avatar.
     * @param b File or blob to load the override from. null value removes the avatar, undefined removes the override.
     */
    @Input()
    set avatarOverride(b: Blob | null | undefined) {
        // Clean up old resource URL, if any
        this.cleanup();

        // Generate a new resource URL
        this.urlOverride = b === null ? null : b ? URL.createObjectURL(b) : undefined;
        this.updateSrc();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('hasAvatar' in changes || 'userId' in changes) {
            this.updateSrc();
        }
    }

    ngOnDestroy(): void {
        this.cleanup();
    }

    /**
     * Release any allocated resources.
     */
    cleanup(): void {
        if (this.urlOverride) {
            URL.revokeObjectURL(this.urlOverride);
            this.urlOverride = undefined;
        }
    }

    private updateSrc() {
        this._src = this.urlOverride ?
            this.sanitizer.bypassSecurityTrustResourceUrl(this.urlOverride) :
            (this.urlOverride === undefined) && this.hasAvatar && this.userId ?
                this.sanitizer.bypassSecurityTrustResourceUrl(`${this.API_CONFIG.basePath}/users/${this.userId}/avatar`) :
                undefined;
    }
}
