import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { ToastService } from '../_services/toast.service';
import { Toast } from '../_models/toast';
import { Paths } from '../_utils/consts';
import { AuthService } from '../_services/auth.service';

@Component({
    selector: 'app-toast',
    templateUrl: './toast.component.html',
    styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {

    autohide = true;

    readonly Paths = Paths;

    // Icons
    readonly faChevronDown = faChevronDown;

    constructor(
        private readonly ref: ChangeDetectorRef,
        private readonly router: Router,
        private readonly toastSvc: ToastService,
        private readonly authSvc: AuthService,
    ) {}

    get toasts(): Toast[] {
        return this.toastSvc.toasts;
    }

    remove(n: Toast): void {
        this.toastSvc.remove(n);
        // Explicitly poke the change detector on element removal (it doesn't get detected automatically)
        this.ref.detectChanges();
    }

    goLogin() {
        // Remember the current route to get back to it after login
        this.authSvc.afterLoginRedirectUrl = this.router.url;

        // Redirect to login
        this.router.navigate([Paths.auth.login]);
    }
}
