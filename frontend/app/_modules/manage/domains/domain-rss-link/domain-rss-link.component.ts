import { Component, computed, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { CopyTextDirective } from '../../../tools/_directives/copy-text.directive';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { ConfigService } from '../../../../_services/config.service';
import { DomainConfigItemKey } from '../../../../_models/config';
import { Utils } from '../../../../_utils/utils';
import { environment } from '../../../../../environments/environment';
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
    readonly pageId = input<string>();

    /** Domain/user metadata. */
    readonly domainMeta = toSignal(this.domainSelectorSvc.domainMeta(false));

    readonly form = this.fb.nonNullable.group({
        userFilter: 'all' as UserFilterKind,
    });

    /** User filter as a signal. */
    readonly userFilter = toSignal(
        this.form.controls.userFilter.valueChanges,
        {initialValue: this.form.controls.userFilter.value});

    // Icons
    readonly faCopy = faCopy;

    constructor(
        private readonly fb: FormBuilder,
        private readonly domainSelectorSvc: DomainSelectorService,
        private readonly cfgSvc: ConfigService,
    ) {}

    /** RSS feed URL. */
    readonly rssUrl = computed<string>(() => {
        const meta = this.domainMeta();

        // Return an empty string if no selected domain or RSS isn't enabled
        if (!meta || !meta.config?.get(DomainConfigItemKey.enableRss).val || !meta.domain?.id) {
            return '';
        }

        // Construct feed parameters
        const up = new URLSearchParams({domain: meta.domain.id});

        // Page ID
        const pageId = this.pageId();
        if (pageId) {
            up.set('page', pageId);
        }

        // User ID
        const userId = meta.principal?.id;
        if (userId) {
            switch (this.userFilter()) {
                case 'author':
                    up.set('author', userId);
                    break;

                // Reply-to user ID
                case 'replies':
                    up.set('replyToUser', userId);
                    break;
            }
        }

        // Construct the complete feed URL
        return Utils.joinUrl(this.cfgSvc.staticConfig.baseUrl, environment.apiBasePath, 'rss/comments') +
            '?' +
            up.toString();
    });
}
