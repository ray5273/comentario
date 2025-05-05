import { Component, computed, Inject, input, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { Commenter, Configuration, Principal, User } from '../../../../generated-api';
import { AnonymousUser } from '../../../_utils/consts';
import { HashColourPipe } from '../_pipes/hash-colour.pipe';

@Component({
    selector: 'app-user-avatar',
    templateUrl: './user-avatar.component.html',
    styleUrls: ['./user-avatar.component.scss'],
    imports: [
        HashColourPipe,
        FaIconComponent,

    ],
})
export class UserAvatarComponent implements OnDestroy {

    /** Avatar size. Defaults to 'S'. */
    readonly size = input<'S' | 'M' | 'L'>('S');

    /** User whose avatar to display. */
    readonly user = input<User | Principal | Commenter>();

    /**
     * Avatar override, file or blob to load the override from. null value removes the avatar, undefined removes the
     * override. If set, will take precedence over the user's avatar.
     */
    readonly avatarOverride = input<Blob | null>();

    /** Optional timestamp to force-update the avatar. */
    readonly updated = input<number>();

    /** Size of the avatar in pixels. */
    readonly pixelSize = computed<number>(() => {
        switch (this.size()) {
            case 'S':
                return 16;
            case 'M':
                return 32;
            default: // 'L' or anything else
                return 128;
        }
    });

    /** The "fetch size" of the avatar, which takes the current device pixel ratio into account. */
    readonly fetchSize = computed<'S' | 'M' | 'L'>(() => {
        switch (true) {
            // For smaller ratios just use the "CSS size"
            case devicePixelRatio < 2:
                return this.size();

            // For larger ratios raise the size up a notch
            case this.size() === 'S':
                return 'M';

            default:
                return 'L';
        }
    });

    /** Generated avatar data URL to clean up later. */
    private objUrl?: string;

    /** Optional avatar URL override to apply. */
    readonly urlOverride = computed<string | null | undefined>(() => {
        // Clean up old resource URL, if any
        this.cleanupUrlOverride();

        // Generate a new resource URL
        const o = this.avatarOverride();
        if (o === null) {
            return null;
        } else if (o) {
            const uo = URL.createObjectURL(o);
            this.objUrl = uo;
            return uo;
        }
        return undefined;
    });

    /** Whether the current user is an anonymous one. */
    readonly isAnonymous = computed<boolean>(() => this.user()?.id === AnonymousUser.id);

    /** Avatar image source. */
    readonly imageSrc = computed<SafeResourceUrl | undefined>(() => {
        // If there's an override, use that as the URL
        const uo = this.urlOverride();
        if (uo) {
            return this.sanitizer.bypassSecurityTrustResourceUrl(uo);
        }

        // Otherwise, use the user's avatar, if any
        const user = this.user();
        if (uo === undefined && user?.hasAvatar && user.id) {
            const up = new URLSearchParams({size: this.fetchSize()});
            if (this.updated()) {
                up.set('_ts', this.updated()!.toString());
            }
            return this.sanitizer.bypassSecurityTrustResourceUrl(
                `${this.API_CONFIG.basePath}/users/${user.id}/avatar?${up.toString()}`);
        }

        // No avatar
        return undefined;
    });

    /** The user's name initial. */
    readonly initial = computed<string>(() => this.user()?.name?.substring(0, 1)?.toUpperCase() || '*');

    // Icons
    readonly faUser = faUser;

    constructor(
        @Inject(Configuration) private readonly API_CONFIG: Configuration,
        private readonly sanitizer: DomSanitizer,
    ) {}

    ngOnDestroy(): void {
        this.cleanupUrlOverride();
    }

    /**
     * Release any allocated resources.
     */
    cleanupUrlOverride(): void {
        if (this.objUrl) {
            URL.revokeObjectURL(this.objUrl);
            this.objUrl = undefined;
        }
    }
}
