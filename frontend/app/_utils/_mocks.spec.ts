import { Observable, of } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { DomainMeta, DomainSelectorService } from '../_modules/manage/_services/domain-selector.service';
import { ProcessingStatus } from './processing-status';

export const mockDomainSelector = (domainEmitter?: Observable<DomainMeta>) => MockProvider(
    DomainSelectorService, {
        domainMeta: () => domainEmitter || of(new DomainMeta()),
        domainLoading: new ProcessingStatus(),
    });
