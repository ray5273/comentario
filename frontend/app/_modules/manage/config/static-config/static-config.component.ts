import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs';
import { ConfigService } from '../../../../_services/config.service';
import { DomainExtension } from '../../../../../generated-api';

@Component({
    selector: 'app-static-config',
    templateUrl: './static-config.component.html',
})
export class StaticConfigComponent implements OnInit {

    extensions?: DomainExtension[];

    readonly cfg = this.configSvc.staticConfig;

    constructor(
        private readonly configSvc: ConfigService,
    ) {}

    ngOnInit(): void {
        // Fetch enabled extensions
        this.configSvc.extensions.pipe(first()).subscribe(ex => this.extensions = ex);
    }
}
