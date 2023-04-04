import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { ApiOwnerService } from '../../../../../generated-api';
import { ProcessingStatus } from '../../../../_utils/processing-status';
import { Animations } from '../../../../_utils/animations';
import { Paths } from '../../../../_utils/consts';

@Component({
    selector: 'app-domain-import',
    templateUrl: './domain-import.component.html',
    animations: [Animations.fadeInOut('slow')],
})
export class DomainImportComponent implements OnInit {

    host = '';
    isComplete = false;
    impCount?: number;

    readonly Paths = Paths;
    readonly importing = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        source: ['commento' as 'commento' | 'disqus', [Validators.required]],
        file:   [undefined as any, [Validators.required]],
    });

    // Icons
    readonly faCheck = faCheck;

    constructor(
        private readonly fb: FormBuilder,
        private readonly route: ActivatedRoute,
        private readonly api: ApiOwnerService,
    ) {}

    get file(): AbstractControl<File | undefined> {
        return this.form.get('file')!;
    }

    ngOnInit(): void {
        this.host = this.route.snapshot.paramMap.get('host') || '';
    }

    submit() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid && this.host) {
            const val = this.form.value;
            this.api.domainImport(this.host, val.source!, val.file)
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
