import { AfterViewInit, ComponentRef, Directive, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { BehaviorSubject, of, switchMap, timer } from 'rxjs';
import { LoaderListComponent } from '../loaders/loader-list/loader-list.component';
import { LoaderCardsComponent } from '../loaders/loader-cards/loader-cards.component';
import { LoaderPieComponent } from '../loaders/loader-pie/loader-pie.component';

export type LoaderKind = 'list' | 'cards' | 'pie';

@Directive({
    selector: '[appLoader]',
})
export class LoaderDirective implements AfterViewInit {

    /** Loader kinds. */
    @Input()
    loaderKind: LoaderKind = 'list';

    private loaderComp?: ComponentRef<LoaderListComponent>;
    private templView?: EmbeddedViewRef<any>;

    /** Emits whenever appLoader changes value. */
    private loader$ = new BehaviorSubject<boolean>(false);

    constructor(
        private readonly templ: TemplateRef<any>,
        private readonly vc: ViewContainerRef,
    ) {}

    /** Whether the spinning animation is shown on the component. */
    @Input()
    set appLoader(b: boolean) {
        this.loader$.next(b);
    }

    ngAfterViewInit(): void {
        this.loader$
            // Emit a delayed 0 when the spinner is to be shown, or immediate 1 when it's to be hidden
            .pipe(switchMap(b => b ? timer(500) : of(1)))
            .subscribe(n => {
                // Loader is shown
                if (n === 0) {
                    // Remove the inserted template, if any
                    this.templView?.destroy();
                    this.templView = undefined;

                    // Insert a loader component instead
                    if (!this.loaderComp) {
                        let comp = LoaderListComponent;
                        switch (this.loaderKind) {
                            case 'cards':
                                comp = LoaderCardsComponent;
                                break;
                            case 'pie':
                                comp = LoaderPieComponent;
                                break;
                        }
                        this.loaderComp = this.vc.createComponent(comp);
                    }

                } else {
                    // If the loader is to be hidden, remove the loader component (if any)
                    this.loaderComp?.destroy();
                    this.loaderComp = undefined;

                    // Instantiate a template view
                    if (!this.templView) {
                        this.templView = this.vc.createEmbeddedView(this.templ);
                    }
                }
            });
    }
}
