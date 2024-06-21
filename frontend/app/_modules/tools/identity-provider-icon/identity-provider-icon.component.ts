import { Component, Input } from '@angular/core';
import { faQuestionCircle, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faGithub, faGitlab, faGoogle, faOpenid, faTwitter } from '@fortawesome/free-brands-svg-icons';

@Component({
    selector: 'app-idp-icon',
    template: '<fa-icon [icon]="icon"/>',
})
export class IdentityProviderIconComponent {

    icon: IconDefinition = faQuestionCircle;

    /**
     * Federated identity provider ID.
     */
    @Input({required: true})
    set idpId(id: string) {
        switch (id) {
            case 'facebook':
                this.icon = faFacebook;
                break;

            case 'github':
                this.icon = faGithub;
                break;

            case 'gitlab':
                this.icon = faGitlab;
                break;

            case 'google':
                this.icon = faGoogle;
                break;

            case 'twitter':
                this.icon = faTwitter;
                break;

            default:
                this.icon = id?.startsWith('oidc:') ? faOpenid : faQuestionCircle;
        }
    }
}
