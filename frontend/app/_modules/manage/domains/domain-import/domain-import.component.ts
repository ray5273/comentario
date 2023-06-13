import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { ApiGeneralService } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Animations } from '../../../../_utils/animations';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-domain-import',
    templateUrl: './domain-import.component.html',
    animations: [Animations.fadeInOut('slow')],
})
export class DomainImportComponent implements OnInit {

    id = '';
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
    ) {}

    get file(): AbstractControl<File | undefined> {
        return this.form.get('file')!;
    }

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid && this.id) {
            const val = this.form.value;
            this.api.domainImport(this.id, val.source!, val.file)
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
