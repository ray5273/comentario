import { AfterViewInit, Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
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

    constructor(
        @Inject(DOCUMENT) private readonly doc: Document,
        private readonly router: Router,
        private readonly modalSvc: NgbModal,
    ) {

        // Subscribe to route changes
        this.router.events
            .pipe(untilDestroyed(this), filter(event => event instanceof NavigationEnd))
            .subscribe(event => {
                // Close any open modal
                this.modalSvc.dismissAll();

                // The sidebar is visible unless we're in the Control Center
                this.hasSidebar = (event as NavigationEnd).url.indexOf('/manage') === 0;
            });

    }

    ngAfterViewInit(): void {
        // Remove the preloader spinner
        this.doc.body.classList.remove('is-spinning-lg');
    }
}
