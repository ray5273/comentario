import { Observable } from 'rxjs';

/**
 * Processing status holder that allows to show a spinner while an Observable is live.
 */
export class ProcessingStatus {
    constructor(
        public active = false,
    ) {}

    /**
     * Operator function that sets active to true upon subscription and back to false when the subscription is completed
     * or errored.
     */
    processing<T>() {
        return (observable: Observable<T>) =>
            new Observable<T>((subscriber) => {
                this.active = true;
                const subscription = observable.subscribe({
                    next: value => subscriber.next(value),
                    error: err => {
                        this.active = false;
                        subscriber.error(err);
                    },
                    complete: () => {
                        this.active = false;
                        subscriber.complete();
                    },
                });

                return () => {
                    subscription.unsubscribe();
                    this.active = false;
                };
            });
    }
}
