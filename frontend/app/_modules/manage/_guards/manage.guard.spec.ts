import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CanActivateFn, UrlTree } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { ManageGuard } from './manage.guard';
import { DomainSelectorService } from '../_services/domain-selector.service';
import { Domain } from '../../../../generated-api';

describe('ManageGuard', () => {

    let domainEmitter: Subject<Domain | undefined>;

    const isDomainSelected: CanActivateFn = (...args) =>
        TestBed.runInInjectionContext(() => ManageGuard.isDomainSelected(...args));

    const runIsDomainSelected = () => isDomainSelected(undefined as any, undefined as any) as Observable<any>;

    beforeEach(() => {
        domainEmitter = new Subject<Domain | undefined>();
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                // Need to explicitly declare as provider because it's scoped to the module
                ManageGuard,
                MockProvider(DomainSelectorService, {domain: domainEmitter}),
            ],
        });
    });

    it('is created', () => {
        expect(isDomainSelected).toBeTruthy();
    });

    it('resolves to true when there\'s domain', done => {
        runIsDomainSelected().subscribe(v => {
            expect(v).toBeTrue();
            done();
        });
        domainEmitter.next({} as Domain);
    });

    it('resolves to domains route when no domain', done => {
        runIsDomainSelected().subscribe((v: UrlTree) => {
            expect(v).toBeInstanceOf(UrlTree);
            expect(v.toString()).toBe('/manage/domains');
            done();
        });
        domainEmitter.next(undefined);
    });
});
