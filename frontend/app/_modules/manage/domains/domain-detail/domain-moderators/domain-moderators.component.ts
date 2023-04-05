import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { ApiOwnerService, Domain } from '../../../../../../generated-api';
import { ProcessingStatus } from '../../../../../_utils/processing-status';
import { ToastService } from '../../../../../_services/toast.service';

@Component({
    selector: 'app-domain-moderators',
    templateUrl: './domain-moderators.component.html',
})
export class DomainModeratorsComponent {

    @Input()
    domain?: Domain;

    @Output()
    updated = new EventEmitter<void>();

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
        private readonly api: ApiOwnerService,
    ) {}

    get email(): AbstractControl<string> {
        return this.form.get('email')!;
    }

    removeModerator(email: string) {
        this.api.domainModeratorDelete(this.domain!.host, {email})
            .pipe(this.deleting.processing())
            .subscribe(() =>{
                // Add a toast
                this.toastSvc.success('moderator-removed');
                // Notify the subscribers
                this.updated.next();
            });
    }

    addModerator() {
        // Mark all controls touched to display validation results
        this.form.markAllAsTouched();

        // Submit the form if it's valid
        if (this.form.valid) {
            this.api.domainModeratorNew(this.domain!.host, {email: this.email.value})
                .pipe(this.adding.processing())
                .subscribe(() => {
                    // Add a toast
                    this.toastSvc.success('moderator-added');
                    // Clear the form
                    this.form.reset();
                    this.form.markAsUntouched();
                    // Notify the subscribers
                    this.updated.next();
                });
        }
    }
}
