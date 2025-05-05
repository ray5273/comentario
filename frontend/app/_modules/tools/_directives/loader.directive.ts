import { ComponentRef, Directive, effect, EmbeddedViewRef, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoaderListComponent } from '../loaders/loader-list/loader-list.component';
import { LoaderCardsComponent } from '../loaders/loader-cards/loader-cards.component';
import { LoaderPieComponent } from '../loaders/loader-pie/loader-pie.component';

export type LoaderKind = 'list' | 'cards' | 'pie';

@Directive({
    selector: '[appLoader]',
})
export class LoaderDirective {

    /** Whether the spinning animation is shown on the component. */
    readonly appLoader = input(false);

    /** Loader kinds. */
    readonly loaderKind = input<LoaderKind>('list');

    /** Whether to show the loader: delayed when loader is activated, immediate when it's to be hidden. */
    readonly show = toSignal(
        toObservable(this.appLoader).pipe(switchMap(b => b ? timer(500) : of(1)), map(n => n === 0)),
        {initialValue: false});

    private loaderComp?: ComponentRef<LoaderListComponent>;
    private templView?: EmbeddedViewRef<any>;

    constructor(
        private readonly templ: TemplateRef<any>,
        private readonly vc: ViewContainerRef,
    ) {
        effect(() => {
            // Loader is shown
            if (this.show()) {
                // Remove the inserted template, if any
                this.templView?.destroy();
                this.templView = undefined;

                // Insert a loader component instead
                if (!this.loaderComp) {
                    let comp = LoaderListComponent;
                    switch (this.loaderKind()) {
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
