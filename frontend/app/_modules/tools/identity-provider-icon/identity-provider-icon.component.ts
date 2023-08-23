import { Component, Input } from '@angular/core';
import { faQuestionCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faGithub, faGitlab, faGoogle, faLinkedin, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { FederatedIdpId } from '../../../../generated-api';

@Component({
    selector: 'app-idp-icon',
    template: '<fa-icon [icon]="icon"></fa-icon>',
})
export class IdentityProviderIconComponent {

    icon: IconDefinition = faQuestionCircle;

    /**
     * Federated identity provider ID.
     */
    @Input({required: true})
    set idpId(id: FederatedIdpId) {
        switch (id) {
            case FederatedIdpId.Facebook:
                this.icon = faFacebook;
                break;

            case FederatedIdpId.Github:
                this.icon = faGithub;
                break;

            case FederatedIdpId.Gitlab:
                this.icon = faGitlab;
                break;

            case FederatedIdpId.Linkedin:
                this.icon = faLinkedin;
                break;

            case FederatedIdpId.Google:
                this.icon = faGoogle;
                break;

            case FederatedIdpId.Twitter:
                this.icon = faTwitter;
                break;

            default:
                this.icon = faQuestionCircle;
        }
    }
}
