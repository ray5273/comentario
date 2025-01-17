import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faCopy, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { NgbCollapseModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Highlight } from 'ngx-highlightjs';
import { Utils } from '../../../../../_utils/utils';
import { ConfigService } from '../../../../../_services/config.service';
import { XtraValidators } from '../../../../../_utils/xtra-validators';
import { CopyTextDirective } from '../../../../tools/_directives/copy-text.directive';
import { InfoBlockComponent } from '../../../../tools/info-block/info-block.component';
import { InfoIconComponent } from '../../../../tools/info-icon/info-icon.component';
import { ValidatableDirective } from '../../../../tools/_directives/validatable.directive';

@UntilDestroy()
@Component({
    selector: 'app-domain-install',
    templateUrl: './domain-install.component.html',
    imports: [
        Highlight,
        CopyTextDirective,
        FaIconComponent,
        NgbCollapseModule,
        NgbTooltipModule,
        InfoBlockComponent,
        InfoIconComponent,
        ReactiveFormsModule,
        ValidatableDirective,
    ],
})
export class DomainInstallComponent implements OnInit {

    /** Whether the snippet options section is collapsed. */
    collapseSnippetOptions = true;

    readonly form = this.fb.nonNullable.group({
        autoInit:              true,
        autoNonInteractiveSso: false,
        liveUpdate:            true,
        noFonts:               false,
        noCss:                 false,
        lang:                  '',
        cssOverride:           ['', [XtraValidators.url(false)]],
        maxLevel:              [10, [Validators.min(1), Validators.max(99)]],
        pageId:                ['', Validators.maxLength(2076)], // 2083 - length of 'http://'
        theme:                 '',
    });

    readonly languages = this.cfgSvc.staticConfig.uiLanguages;

    // Icons
    readonly faChevronDown         = faChevronDown;
    readonly faCopy                = faCopy;
    readonly faExclamationTriangle = faExclamationTriangle;

    private readonly scriptUrl = Utils.joinUrl(this.cfgSvc.staticConfig.baseUrl, 'comentario.js');

    constructor(
        private readonly fb: FormBuilder,
        private readonly cfgSvc: ConfigService,
    ) {}

    get snippet(): string {
        let opts = '';
        const val = this.form.value;

        if (!val.autoInit) {
            opts += ' auto-init="false"';
        }
        if (val.autoNonInteractiveSso) {
            opts += ' auto-non-interactive-sso="true"';
        }
        if (!val.liveUpdate) {
            opts += ' live-update="false"';
        }
        if (val.noFonts) {
            opts += ' no-fonts="true"';
        }
        if (val.lang) {
            opts += ` lang="${val.lang}"`;
        }
        if (val.noCss) {
            opts += ' css-override="false"';
        } else if (val.cssOverride) {
            opts += ` css-override="${Utils.escapeAttrValue(val.cssOverride)}"`;
        }
        if (val.maxLevel != 10) {
            opts += ` max-level="${val.maxLevel}"`;
        }
        if (val.pageId) {
            opts += ` page-id="${Utils.escapeAttrValue(val.pageId)}"`;
        }
        if (val.theme) {
            opts += ` theme="${val.theme}"`;
        }
        return `<script defer src="${this.scriptUrl}"></script>\n` +
            `<comentario-comments${opts}></comentario-comments>`;
    }

    ngOnInit(): void {
        // Disable CSS override URL if CSS is turned off entirely
        this.form.controls.noCss.valueChanges
            .pipe(untilDestroyed(this))
            .subscribe(b => Utils.enableControls(!b, this.form.controls.cssOverride));
    }
}
