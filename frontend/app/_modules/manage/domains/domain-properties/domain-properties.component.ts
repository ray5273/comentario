import { Component, OnInit } from '@angular/core';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { combineLatestWith, first } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEdit, faTicket } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DomainExtension, FederatedIdentityProvider } from '../../../../../generated-api';
import { ConfigService } from '../../../../_services/config.service';
import { Paths } from '../../../../_utils/consts';
import { DomainMeta, DomainSelectorService } from '../../_services/domain-selector.service';
import { DomainBadgeComponent } from '../../badges/domain-badge/domain-badge.component';
import { DomainInstallComponent } from './domain-install/domain-install.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { ExternalLinkDirective } from '../../../tools/_directives/external-link.directive';
import { CheckmarkComponent } from '../../../tools/checkmark/checkmark.component';
import { CommentSortPipe } from '../../_pipes/comment-sort.pipe';
import { DynConfigSectionNamePipe } from '../../_pipes/dyn-config-section-name.pipe';
import { DynConfigItemNamePipe } from '../../_pipes/dyn-config-item-name.pipe';
import { DynConfigItemValueComponent } from '../../dyn-config-item-value/dyn-config-item-value.component';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { IdentityProviderIconComponent } from '../../../tools/identity-provider-icon/identity-provider-icon.component';
import { ModeratorNotifyPolicyPipe } from '../../_pipes/moderator-notify-policy.pipe';
import { DatetimePipe } from '../../_pipes/datetime.pipe';
import { AttributeTableComponent } from '../../attribute-table/attribute-table.component';
import { NoDataComponent } from '../../../tools/no-data/no-data.component';
import { DomainRssLinkComponent } from '../domain-rss-link/domain-rss-link.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-properties',
    templateUrl: './domain-properties.component.html',
    imports: [
        DomainBadgeComponent,
        DomainInstallComponent,
        SpinnerDirective,
        RouterLink,
        FaIconComponent,
        ExternalLinkDirective,
        CheckmarkComponent,
        CommentSortPipe,
        KeyValuePipe,
        DynConfigSectionNamePipe,
        DynConfigItemNamePipe,
        DynConfigItemValueComponent,
        InfoIconComponent,
        IdentityProviderIconComponent,
        ModeratorNotifyPolicyPipe,
        DatetimePipe,
        DecimalPipe,
        AttributeTableComponent,
        NoDataComponent,
        DomainRssLinkComponent,
    ],
})
export class DomainPropertiesComponent implements OnInit {

    /** Domain/user metadata. */
    domainMeta?: DomainMeta;

    /** List of federated identity providers configured in the domain. */
    fedIdps?: FederatedIdentityProvider[];

    /** List of extensions enabled in the domain. */
    extensions?: DomainExtension[];

    readonly domainLoading = this.domainSelectorSvc.domainLoading;
    readonly Paths = Paths;

    // Icons
    readonly faEdit   = faEdit;
    readonly faTicket = faTicket;

    constructor(
        private readonly cfgSvc: ConfigService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    /**
     * Whether any specific moderator approval policy is in place.
     */
    get hasApprovalPolicy(): boolean {
        const d = this.domainMeta?.domain;
        return !!d && !!(
            d.modAnonymous ||
            d.modAuthenticated ||
            d.modNumComments ||
            d.modUserAgeDays ||
            d.modImages ||
            d.modLinks);
    }

    ngOnInit(): void {
        // Subscribe to domain changes to obtain domain and IdP data
        this.domainSelectorSvc.domainMeta(true)
            .pipe(
                untilDestroyed(this),
                combineLatestWith(this.cfgSvc.extensions.pipe(first())))
            .subscribe(([meta, exts]) => {
                this.domainMeta = meta;
                // Only add those federated identity providers available globally
                this.fedIdps = this.cfgSvc.staticConfig.federatedIdps?.filter(idp => meta.federatedIdpIds?.includes(idp.id));
                // Only add those extensions available globally
                this.extensions = exts?.filter(ex => meta.extensions?.some(me => me.id === ex.id));
            });
    }
}
