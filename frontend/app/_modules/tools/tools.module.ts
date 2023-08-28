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
import { ServerMessageComponent } from './server-message/server-message.component';
import { CopyTextDirective } from './_directives/copy-text.directive';
import { IdentityProviderIconComponent } from './identity-provider-icon/identity-provider-icon.component';
import { InfoBlockComponent } from './info-block/info-block.component';

@NgModule({
    declarations: [
        CheckmarkComponent,
        ConfirmDialogComponent,
        ConfirmDirective,
        CopyTextDirective,
        IdentityProviderIconComponent,
        PasswordInputComponent,
        ServerMessageComponent,
        SpinnerDirective,
        InfoBlockComponent,
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
        ServerMessageComponent,
        SpinnerDirective,
        CopyTextDirective,
        IdentityProviderIconComponent,
        InfoBlockComponent,
    ],
})
export class ToolsModule {}
