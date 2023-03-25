import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { PasswordInputComponent } from './password-input/password-input.component';
import { SpinnerDirective } from './_directives/spinner.directive';
import { ConfirmDirective } from './_directives/confirm.directive';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { CheckmarkComponent } from './checkmark/checkmark.component';

@NgModule({
    declarations: [
        CheckmarkComponent,
        ConfirmDialogComponent,
        ConfirmDirective,
        PasswordInputComponent,
        SpinnerDirective,
    ],
    imports: [
        CommonModule,
        FormsModule,
        FontAwesomeModule,
        NgbModalModule,
    ],
    exports: [
        CheckmarkComponent,
        ConfirmDialogComponent,
        ConfirmDirective,
        PasswordInputComponent,
        SpinnerDirective,
    ],
})
export class ToolsModule {}
