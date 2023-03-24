import { Component } from '@angular/core';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { Paths } from '../_utils/consts';
import { DocsService } from '../_services/docs.service';
import { AuthService } from '../_services/auth.service';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {

    readonly Paths = Paths;

    // Icons
    readonly faUser = faUser;

    constructor(
        readonly authSvc: AuthService,
        readonly docsSvc: DocsService,
    ) {}
}
