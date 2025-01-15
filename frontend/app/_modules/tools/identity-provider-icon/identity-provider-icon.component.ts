import { Component, Input } from '@angular/core';
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
    @Input({})
    sso: boolean | null | undefined;

    /** Federated identity provider ID. Ignored if it's an SSO user. */
    @Input({required: true})
    idpId: string | null | undefined;

    /** Icon to render. */
    get icon(): IconDefinition | undefined {
        switch (this.idpId) {
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
                return this.sso ? faIdCard : undefined;
        }
        return this.idpId.startsWith('oidc:') ? faOpenid : faQuestionCircle;
    }
}
