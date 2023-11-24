import { Component, HostBinding, Inject, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Commenter, Configuration, Principal, User } from '../../../../generated-api';

@Component({
    selector: 'app-user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
})
export class UserAvatarComponent implements OnChanges, OnDestroy {

    /** Avatar size. */
    @Input()
    size: 'S' | 'M' | 'L' = 'S';

    /** User whose avatar to display. */
    @Input({required: true})
    user?: User | Principal | Commenter;

    /** Optional timestamp to force-update the avatar. */
    @Input()
    updated?: number;

    _src?: SafeResourceUrl;
    urlOverride?: string | null;

    constructor(
        @Inject(Configuration) private readonly API_CONFIG: Configuration,
        private readonly sanitizer: DomSanitizer,
    ) {}

    @HostBinding('class')
    get classes(): string[] {
        return [`size-${this.size.toLowerCase()}`, `user-bg-colour-${this.user?.colourIndex || 0}`];
    }

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
        if ('user' in changes) {
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
            // If there's an override, use that as the URL
            this.sanitizer.bypassSecurityTrustResourceUrl(this.urlOverride) :
            // Otherwise, use the user's avatar, if any
            (this.urlOverride === undefined) && this.user?.hasAvatar && this.user?.id ?
                this.sanitizer.bypassSecurityTrustResourceUrl(
                    `${this.API_CONFIG.basePath}/users/${this.user.id}/avatar?size=${this.size}` +
                    (this.updated ? `&_ts=${this.updated}` : '')) :
                undefined;
    }
}
