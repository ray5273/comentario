import { Component, Inject, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { Commenter, Configuration, Principal, User } from '../../../../generated-api';
import { AnonymousUser } from '../../../_utils/consts';

@Component({
    selector: 'app-user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
})
export class UserAvatarComponent implements OnChanges, OnDestroy {

    /** Avatar size. Defaults to 'S'. */
    @Input()
    size: 'S' | 'M' | 'L' = 'S';

    /** User whose avatar to display. */
    @Input({required: true})
    user?: User | Principal | Commenter;

    /** Optional timestamp to force-update the avatar. */
    @Input()
    updated?: number;

    _src?: SafeResourceUrl;
    isAnonymous = false;
    urlOverride?: string | null;

    // Icons
    readonly faUser = faUser;

    constructor(
        @Inject(Configuration) private readonly API_CONFIG: Configuration,
        private readonly sanitizer: DomSanitizer,
    ) {}

    /**
     * The "pixel size" of the avatar, which takes the current device pixel ratio into account.
     */
    get pixelSize(): 'S' | 'M' | 'L' {
        switch (true) {
            // For smaller ratios just use the "CSS size"
            case devicePixelRatio < 2:
                return this.size;

            // For larger ratios raise the size up a notch
            case this.size === 'S':
                return 'M';

            default:
                return 'L';
        }
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
        if ('user' in changes || 'size' in changes) {
            this.updateSrc();
            this.isAnonymous = this.user?.id === AnonymousUser.id;
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
                    `${this.API_CONFIG.basePath}/users/${this.user.id}/avatar?size=${this.pixelSize}` +
                    (this.updated ? `&_ts=${this.updated}` : '')) :
                undefined;
    }
}
