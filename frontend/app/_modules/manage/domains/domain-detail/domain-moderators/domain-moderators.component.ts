import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ApiGeneralService, Domain } from '../../../../../../generated-api';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { ToastService } from '../../../../../_services/toast.service';
import { DomainDetailComponent } from '../domain-detail.component';

@UntilDestroy()
@Component({
    selector: 'app-domain-moderators',
    templateUrl: './domain-moderators.component.html',
})
export class DomainModeratorsComponent {

    domain?: Domain;

    readonly adding   = new ProcessingStatus();
    readonly deleting = new ProcessingStatus();
    readonly form = this.fb.nonNullable.group({
        email: ['', [Validators.email]],
    });

    // Icons
    readonly faXmark = faXmark;

    constructor(
        private readonly fb: FormBuilder,
        private readonly toastSvc: ToastService,
        private readonly api: ApiGeneralService,
        private readonly details: DomainDetailComponent,
    ) {
        // Subscribe to domain changes
        details.domain
            .pipe(untilDestroyed(this))
            .subscribe(d => this.domain = d);
    }

    get email(): AbstractControl<string> {
        return this.form.get('email')!;
    }

    removeModerator(email: string) {
        this.api.domainModeratorDelete(this.domain!.host, {email})
            .pipe(this.deleting.processing())
            .subscribe(() =>{
                // Add a toast
                this.toastSvc.success('moderator-removed');
                // Reload the details
                this.details.reload();
            });
    }

    addModerator() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.domain && this.form.valid) {
            this.api.domainModeratorNew(this.domain.host, {email: this.email.value})
                .pipe(this.adding.processing())
                .subscribe(() => {
                    // Add a toast
                    this.toastSvc.success('moderator-added');
                    // Clear the form
                    this.form.reset();
                    this.form.markAsUntouched();
                    // Reload the details
                    this.details.reload();
                });
        }
    }
}
