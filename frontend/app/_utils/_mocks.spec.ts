import { Directive, Input } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { DomainMeta, DomainSelectorService } from '../_modules/manage/_services/domain-selector.service';
import { ProcessingStatus } from './processing-status';
import { AuthService } from '../_services/auth.service';
import { Principal } from '../../generated-api';
import { HighlightLoader } from 'ngx-highlightjs';

export const mockDomainSelector = (domainEmitter?: Observable<DomainMeta>) => MockProvider(
    DomainSelectorService, {
        domainMeta:    () => domainEmitter || of(new DomainMeta()),
        domainLoading: new ProcessingStatus(),
    });

export const mockAuthService = (principalEmitter?: Observable<Principal | undefined>) => MockProvider(
    AuthService, {
        principal: principalEmitter || of(undefined),
    });

@Directive({
    // eslint-disable-next-line @angular-eslint/directive-selector
    selector: '[highlight]',
    standalone: true,
})
export class MockHighlightDirective {
    @Input()
    highlight?: string;

    @Input()
    language?: string;
}

export const mockHighlightLoaderStub = () =>
    ({provides: HighlightLoader, useValue: {ready: new Promise(resolve => resolve({}))}});
