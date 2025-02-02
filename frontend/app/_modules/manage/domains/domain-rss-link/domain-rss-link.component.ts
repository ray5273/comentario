import { Component, Input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CopyTextDirective } from '../../../tools/_directives/copy-text.directive';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';
import { DomainConfigItemKey } from '../../../../_models/config';
import { Utils } from '../../../../_utils/utils';
import { environment } from '../../../../../environments/environment';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { ExternalLinkDirective } from '../../../tools/_directives/external-link.directive';

type UserFilterKind = 'all' | 'author' | 'replies';

@UntilDestroy()
@Component({
    selector: 'app-domain-rss-link',
    templateUrl: './domain-rss-link.component.html',
    imports: [
        ReactiveFormsModule,
        CopyTextDirective,
        FaIconComponent,
        NgbTooltip,
        ExternalLinkDirective,
    ],
})
export class DomainRssLinkComponent {

    /** Optional domain page ID to include in the filter. */
    @Input()
    pageId?: string;

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    readonly form = this.fb.nonNullable.group({
        userFilter: 'all' as UserFilterKind,
    });

    // Icons
    readonly faCopy = faCopy;

    constructor(
        private readonly fb: FormBuilder,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly cfgSvc: ConfigService,
    ) {
        this.domainSelectorSvc.domainMeta(false)
            .pipe(untilDestroyed(this))
            .subscribe(dm => this.domainMeta = dm);
    }

    /**
     * Whether RSS is enabled for the current domain.
     */
    get enabled(): boolean {
        return !!this.domainMeta?.config?.get(DomainConfigItemKey.enableRss).val;
    }

    /**
     * Construct and return a RSS feed URL.
     */
    get rssUrl(): string {
        // Return an empty string if no selected domain or RSS isn't enabled
        if (!this.enabled || !this.domainMeta?.domain?.id) {
            return '';
        }

        // Construct feed parameters
        const up = new URLSearchParams({domain: this.domainMeta.domain.id});

        // Page ID
        if (this.pageId) {
            up.set('page', this.pageId);
        }

        // User ID
        const uk = this.form.controls.userFilter.value;
        const userId = this.domainMeta.principal?.id;
        if (uk === 'author' && userId) {
            up.set('author', userId);
        }

        // Reply-to user ID
        if (uk === 'replies' && userId) {
            up.set('replyToUser', userId);
        }

        // Construct the complete feed URL
        return Utils.joinUrl(this.cfgSvc.staticConfig.baseUrl, environment.apiBasePath, 'rss/comments') +
            '?' +
            up.toString();
    }
}
