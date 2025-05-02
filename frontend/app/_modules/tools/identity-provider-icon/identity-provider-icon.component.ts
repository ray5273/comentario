import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faIdCard, faQuestionCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faGithub, faGitlab, faGoogle, faOpenid, faTwitter } from '@fortawesome/free-brands-svg-icons';

@Component({
    selector: 'app-idp-icon',
    templateUrl: './identity-provider-icon.component.html',
    imports: [
        FaIconComponent,
    ],
})
export class IdentityProviderIconComponent {

    /** Whether it's an SSO federated user. */
    readonly sso = input<boolean | null>();

    /** Federated identity provider ID. Ignored if it's an SSO user. */
    readonly idpId = input<string | null>();

    /** Icon to render. */
    readonly icon = computed<IconDefinition | undefined>(() => {
        switch (this.idpId()) {
            case 'facebook':
                return faFacebook;

            case 'github':
                return faGithub;

            case 'gitlab':
                return faGitlab;

            case 'google':
                return faGoogle;

            case 'twitter':
                return faTwitter;

            case null:
            case undefined:
            case '':
                return this.sso() ? faIdCard : undefined;
        }
        return this.idpId()?.startsWith('oidc:') ? faOpenid : faQuestionCircle;
    });

    /** Icon title. */
    readonly iconTitle = computed<string>(() => {
        const id = this.idpId();
        switch (id) {
            case 'facebook':
                return 'Facebook';

            case 'github':
                return 'GitHub';

            case 'gitlab':
                return 'GitLab';

            case 'google':
                return 'Google';

            case 'twitter':
                return 'Twitter/X';
        }
        return id?.startsWith('oidc:') ? id?.substring(5) : '';
    });
}
