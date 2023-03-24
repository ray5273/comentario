import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { PasswordInputComponent } from './password-input/password-input.component';
import { SpinnerDirective } from './_directives/spinner.directive';
import { ConfirmDirective } from './_directives/confirm.directive';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

@NgModule({
    declarations: [
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
        ConfirmDialogComponent,
        ConfirmDirective,
        PasswordInputComponent,
        SpinnerDirective,
    ],
})
export class ToolsModule {}
