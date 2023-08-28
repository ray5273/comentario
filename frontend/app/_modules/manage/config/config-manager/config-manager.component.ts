import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-config-manager',
    templateUrl: './config-manager.component.html',
})
export class ConfigManagerComponent {

    readonly Paths = Paths;

    constructor(
        readonly router: Router,
    ) {}
}
