import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ConfigService, ReleaseMetadata } from '../../../../_services/config.service';
import { DomainExtension } from '../../../../../generated-api';

@UntilDestroy()
@Component({
    selector: 'app-static-config',
    templateUrl: './static-config.component.html',
})
export class StaticConfigComponent implements OnInit {

    extensions?: DomainExtension[];
    upgradeAvailable?: boolean;
    stableRelease?: ReleaseMetadata;

    readonly cfg = this.configSvc.staticConfig;

    constructor(
        private readonly configSvc: ConfigService,
    ) {}

    ngOnInit(): void {
        // Fetch enabled extensions
        this.configSvc.extensions.pipe(first()).subscribe(ex => this.extensions = ex);

        // Fetch the available stable version
        this.configSvc.upgradeAvailable.pipe(untilDestroyed(this)).subscribe(b => this.upgradeAvailable = b);
        this.configSvc.stableRelease   .pipe(untilDestroyed(this)).subscribe(r => this.stableRelease = r);
    }
}
