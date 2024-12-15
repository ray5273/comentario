import { AfterViewInit, Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, RouteConfigLoadEnd, RouteConfigLoadStart, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@UntilDestroy()
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {

    title = 'Comentario';
    hasSidebar = false;

    /** Whether a module is being lazy-loaded. */
    moduleLoading = false;
    moduleLoadingSub?: Subscription;

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly router: Router,
        private readonly modalSvc: NgbModal,
    ) {
        // Subscribe to route changes
        this.router.events
            .pipe(untilDestroyed(this))
            .subscribe(event => {
                switch (true) {
                    // After a route change
                    case event instanceof NavigationEnd:
                        // Close any open modal
                        this.modalSvc.dismissAll();

                        // The sidebar is visible unless we're in the Control Center
                        this.hasSidebar = event.url.indexOf('/manage') === 0;
                        break;

                    // Lazy-loading a module starting
                    case event instanceof RouteConfigLoadStart:
                        this.moduleLoadingSub = timer(200).subscribe(() => this.moduleLoading = true);
                        break;

                    // Lazy-loading a module ended
                    case event instanceof RouteConfigLoadEnd:
                        this.moduleLoadingSub?.unsubscribe();
                        this.moduleLoadingSub = undefined;
                        this.moduleLoading = false;
                        break;
                }
            });

    }

    ngAfterViewInit(): void {
        // Remove the preloader spinner
        this.doc.body.classList.remove('is-spinning-lg');
    }
}
