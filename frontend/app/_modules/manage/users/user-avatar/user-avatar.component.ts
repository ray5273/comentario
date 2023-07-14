import { Component, Input, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiGeneralService, Principal, User } from '../../../../../generated-api';

@Component({
    selector: 'app-user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
})
export class UserAvatarComponent implements OnDestroy {

    _user?: Partial<User | Principal>;
    _src?: SafeResourceUrl;
    url?: string;
    urlOverride?: string | null;

    constructor(
        private readonly sanitizer: DomSanitizer,
        private readonly api: ApiGeneralService,
    ) {}

    /**
     * Avatar override, if set, taking precedence over the user's avatar.
     * @param f File to load the override from. null value removes the avatar, undefined removes the override.
     */
    @Input()
    set avatarOverride(f: File | null | undefined) {
        // Clean up old resource URL, if any
        if (this.urlOverride) {
            URL.revokeObjectURL(this.urlOverride);
        }

        // Generate a new resource URL
        this.urlOverride = f === null ? null : f ? URL.createObjectURL(f) : undefined;
        this.updateSrc();
    }

    /** User or principal whose avatar is to be displayed. */
    @Input({required: true})
    set user(u: Partial<User | Principal> | undefined) {
        this._user = u;
        this.reload();
    }

    ngOnDestroy(): void {
        this.cleanup();
    }

    /**
     * Release any allocated resources.
     */
    cleanup(): void {
        if (this.url) {
            URL.revokeObjectURL(this.url);
            this.url = undefined;
        }
        if (this.urlOverride) {
            URL.revokeObjectURL(this.urlOverride);
            this.urlOverride = undefined;
        }
    }

    reload(): void {
        // Release any resources
        this.cleanup();

        //  If there's a user, and they have an avatar image, retrieve that
        if (this.user?.id && this.user.hasAvatar) {
            this.api.userAvatarGet(this.user.id)
                .subscribe(b => {
                    this.url = URL.createObjectURL(b);
                    this.updateSrc();
                });
        }
    }

    private updateSrc() {
        this._src = this.urlOverride ?
            this.sanitizer.bypassSecurityTrustResourceUrl(this.urlOverride) :
            this.url ? this.sanitizer.bypassSecurityTrustResourceUrl(this.url) : undefined;
    }
}
