import { Directive, Input } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { DomainMeta, DomainSelectorService } from '../_modules/manage/_services/domain-selector.service';
import { ProcessingStatus } from './processing-status';
import { HighlightLoader } from 'ngx-highlightjs';
import { ConfigService } from '../_services/config.service';
import { DynamicConfig } from '../_models/config';

export const mockConfigService = () => MockProvider(
    ConfigService, {
        staticConfig: {
            baseUrl:              '',
            baseDocsUrl:          'https://docs.base.url',
            termsOfServiceUrl:    '',
            privacyPolicyUrl:     '',
            version:              '',
            buildDate:            '',
            serverTime:           '',
            dbVersion:            '',
            defaultLangId:        '',
            homeContentUrl:       '',
            federatedIdps:        [],
            resultPageSize:       25,
            uiLanguages:          [{id: 'en', nameEnglish: 'English', nameNative: 'English', isFrontendLanguage: true}],
            liveUpdateEnabled:    true,
            pageViewStatsEnabled: true,
        },
        pluginConfig: {
            plugins: [],
        },
        latestRelease: of({name: '', version: '', pageUrl: ''}),
        isUpgradable:  of(false),
        canLoadMore:   () => false,
        extensions:    of([]),
        dynamicConfig: of(new DynamicConfig()),
    });

export const mockDomainSelector = (domainEmitter?: Observable<DomainMeta>) => MockProvider(
    DomainSelectorService, {
        domainMeta:    () => domainEmitter || of(new DomainMeta()),
        domainLoading: new ProcessingStatus(),
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
