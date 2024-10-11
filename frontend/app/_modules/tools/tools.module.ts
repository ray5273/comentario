import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModalModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CheckmarkComponent } from './checkmark/checkmark.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { ConfirmDirective } from './_directives/confirm.directive';
import { CopyTextDirective } from './_directives/copy-text.directive';
import { IdentityProviderIconComponent } from './identity-provider-icon/identity-provider-icon.component';
import { InfoBlockComponent } from './info-block/info-block.component';
import { InfoIconComponent } from './info-icon/info-icon.component';
import { ListFooterComponent } from './list-footer/list-footer.component';
import { NoDataComponent } from './no-data/no-data.component';
import { PasswordInputComponent } from './password-input/password-input.component';
import { ServerMessageComponent } from './server-message/server-message.component';
import { SpinnerDirective } from './_directives/spinner.directive';
import { UserAvatarComponent } from './user-avatar/user-avatar.component';
import { ExternalLinkDirective } from './_directives/external-link.directive';
import { HashColourPipe } from './_pipes/hash-colour.pipe';

@NgModule({
    declarations: [
        CheckmarkComponent,
        ConfirmDialogComponent,
        ConfirmDirective,
        CopyTextDirective,
        ExternalLinkDirective,
        HashColourPipe,
        IdentityProviderIconComponent,
        InfoBlockComponent,
        InfoIconComponent,
        ListFooterComponent,
        NoDataComponent,
        PasswordInputComponent,
        ServerMessageComponent,
        SpinnerDirective,
        UserAvatarComponent,
    ],
    imports: [
        CommonModule,
        FormsModule,
        FontAwesomeModule,
        NgbModalModule,
        NgbTooltipModule,
    ],
    exports: [
        CheckmarkComponent,
        ConfirmDialogComponent,
        ConfirmDirective,
        CopyTextDirective,
        ExternalLinkDirective,
        HashColourPipe,
        IdentityProviderIconComponent,
        InfoBlockComponent,
        InfoIconComponent,
        ListFooterComponent,
        NoDataComponent,
        PasswordInputComponent,
        ServerMessageComponent,
        SpinnerDirective,
        UserAvatarComponent,
    ],
})
export class ToolsModule {}
