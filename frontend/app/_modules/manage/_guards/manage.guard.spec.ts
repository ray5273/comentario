import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { CanActivateFn, UrlTree } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { ManageGuard } from './manage.guard';
import { DomainMeta } from '../_services/domain-selector.service';
import { Domain } from '../../../../generated-api';
import { mockDomainSelector } from '../../../_utils/_mocks.spec';

describe('ManageGuard', () => {

    let domainEmitter: Subject<DomainMeta>;

    const isDomainSelected: CanActivateFn = (...args) =>
        TestBed.runInInjectionContext(() => ManageGuard.isDomainSelected(...args));

    const runIsDomainSelected = () => isDomainSelected(undefined as any, undefined as any) as Observable<any>;

    beforeEach(() => {
        domainEmitter = new Subject<DomainMeta>();
        TestBed.configureTestingModule({
            imports: [RouterModule.forRoot([])],
            providers: [
                // Need to explicitly declare as provider because it's scoped to the module
                ManageGuard,
                mockDomainSelector(domainEmitter),
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
        domainEmitter.next(new DomainMeta({} as Domain));
    });

    it('resolves to domains route when no domain', done => {
        runIsDomainSelected().subscribe((v: UrlTree) => {
            expect(v).toBeInstanceOf(UrlTree);
            expect(v.toString()).toBe('/manage/domains');
            done();
        });
        domainEmitter.next(new DomainMeta());
    });
});
