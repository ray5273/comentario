import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-config-manager',
    templateUrl: './config-manager.component.html',
    imports: [
        NgbNavModule,
        RouterLink,
        RouterOutlet,
    ],
})
export class ConfigManagerComponent {

    readonly Paths = Paths;

    constructor(
        readonly router: Router,
    ) {}
}
