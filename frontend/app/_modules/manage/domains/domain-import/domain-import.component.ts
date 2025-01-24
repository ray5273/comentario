import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain, ImportResult } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Animations } from '../../../../_utils/animations';
import { Paths } from '../../../../_utils/consts';
import { DomainSelectorService } from '../../_services/domain-selector.service';
import { XtraValidators } from '../../../../_utils/xtra-validators';
import { InfoIconComponent } from '../../../tools/info-icon/info-icon.component';
import { SpinnerDirective } from '../../../tools/_directives/spinner.directive';
import { ValidatableDirective } from '../../../tools/_directives/validatable.directive';

@UntilDestroy()
@Component({
    selector: 'app-domain-import',
    templateUrl: './domain-import.component.html',
    styleUrls: ['./domain-import.component.scss'],
    animations: [Animations.fadeInOut('slow')],
    imports: [
        InfoIconComponent,
        FaIconComponent,
        ReactiveFormsModule,
        DecimalPipe,
        RouterLink,
        SpinnerDirective,
        NgOptimizedImage,
        ValidatableDirective,
    ],
})
export class DomainImportComponent implements OnInit {

    /** Target domain. */
    domain?: Domain;

    /** Import result. */
    result?: ImportResult;

    readonly Paths = Paths;
    readonly importing = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        source: ['comentario' as 'comentario' | 'disqus' | 'wordpress', [Validators.required]],
        file:   [undefined as any, [Validators.required, XtraValidators.maxSize(10 * 1024 * 1024)]],
    });

    // Icons
    readonly faCheck               = faCheck;
    readonly faExclamationTriangle = faExclamationTriangle;

    constructor(
        private readonly fb: FormBuilder,
        private readonly api: ApiGeneralService,
        private readonly domainSelectorSvc: DomainSelectorService,
    ) {}

    get source() {
        return this.form.controls.source.value;
    }

    set source(source: 'comentario' | 'disqus' | 'wordpress') {
        this.form.controls.source.setValue(source);
    }

    ngOnInit(): void {
        this.domainSelectorSvc.domainMeta(true)
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
                    this.result = r;

                    // Reload the domain to update its metrics
                    this.domainSelectorSvc.reload();
                });
        }
    }

    onFileSelected(event: Event) {
        this.form.controls.file.setValue((event.target as HTMLInputElement).files?.[0]);
    }
}
