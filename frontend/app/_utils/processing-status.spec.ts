import { Subject } from 'rxjs';
import { ProcessingStatus } from './processing-status';

describe('ProcessingStatus', () => {

    let ps: ProcessingStatus;
    let subj: Subject<void>;

    beforeEach(() => {
        ps = new ProcessingStatus();
        subj = new Subject<void>();
    });

    it('is created in inactive state', () => {
        expect(ps.active).toBeFalse();
    });

    it('is active on subscription processing and inactive after completion', (done: DoneFn) => {
        subj
            .pipe(ps.processing())
            .subscribe({
                error: () => fail(),
                next: () => expect(ps.active).toBeTrue(),
                complete: () => {
                    expect(ps.active).toBeFalse();
                    done();
                },
            });

        // Right upon subscription active must already be true
        expect(ps.active).toBeTrue();

        // Issue multiple values
        for (let i = 0; i < 5; i++) {
            subj.next();
        }

        // Complete the observable
        subj.complete();
    });

    it('gets inactive on error', (done: DoneFn) => {
        subj
            .pipe(ps.processing())
            .subscribe({
                error: () => {
                    expect(ps.active).toBeFalse();
                    done();
                },
                next: () => fail(),
                complete: () => fail(),
            });

        // Right upon subscription active must already be true
        expect(ps.active).toBeTrue();

        // Error the observable
        subj.error('ouch');
    });

    it('gets inactive on unsubscribe', () => {
        const sub = subj.pipe(ps.processing()).subscribe();

        // Right upon subscription active must already be true
        expect(ps.active).toBeTrue();

        // Terminate the subscription
        sub.unsubscribe();
        expect(ps.active).toBeFalse();
    });
});
