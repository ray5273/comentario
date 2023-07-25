import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Animations } from '../../../../_utils/animations';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from '../../_services/domain-selector.service';

@UntilDestroy()
@Component({
    selector: 'app-domain-import',
    templateUrl: './domain-import.component.html',
    animations: [Animations.fadeInOut('slow')],
})
export class DomainImportComponent implements OnInit {

    domain?: Domain;
    isComplete = false;
    impCount?: number;

    readonly Paths = Paths;
    readonly importing = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        source: ['commento' as 'commento' | 'disqus', [Validators.required]],
        file:   [undefined as any, [Validators.required]],
    });

    // Icons
    readonly faCheck               = faCheck;
    readonly faExclamationTriangle = faExclamationTriangle;

    constructor(
        private readonly fb: FormBuilder,
        private readonly route: ActivatedRoute,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {
        // Monitor the domain ID param in the route
        this.domainSelectorSvc.monitorRouteParam(this, this.route, 'id');
    }

    get file(): AbstractControl<File | undefined> {
        return this.form.get('file')!;
    }

    ngOnInit(): void {
        this.domainSelectorSvc.domainMeta
            .pipe(untilDestroyed(this))
            .subscribe(meta => this.domain = meta.domain);
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid && this.domain) {
            const val = this.form.value;
            this.api.domainImport(this.domain.id!, val.source!, val.file)
                .pipe(this.importing.processing())
                .subscribe(r => {
                    this.impCount = r.numImported;
                    this.isComplete = true;
                });
        }
    }

    onFileSelected(event: Event) {
        this.file.setValue((event.target as HTMLInputElement).files?.[0]);
    }
}
