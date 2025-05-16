import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { DomainPage } from '../../../../../../generated-api';
import { DomainSelectorService } from '../../../_services/domain-selector.service';
import { Paths } from '../../../../../_utils/consts';
import { ExternalLinkDirective } from '../../../../tools/_directives/external-link.directive';
import { CheckmarkComponent } from '../../../../tools/checkmark/checkmark.component';
import { DatetimePipe } from '../../../_pipes/datetime.pipe';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { DomainRssLinkComponent } from '../../domain-rss-link/domain-rss-link.component';

@Component({
    selector: 'app-domain-page-details',
    templateUrl: './domain-page-details.component.html',
    imports: [
        RouterLink,
        ExternalLinkDirective,
        CheckmarkComponent,
        DatetimePipe,
        DecimalPipe,
        InfoIconComponent,
        DomainRssLinkComponent,
    ],
})
export class DomainPageDetailsComponent {

    /** The domain page in question. */
    readonly page = input<DomainPage>();

    /** The current domain/user metadata. */
    readonly domainMeta = toSignal(inject(DomainSelectorService).domainMeta(true));

    readonly Paths = Paths;
}
