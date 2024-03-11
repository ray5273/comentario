import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { faChevronDown, faCopy, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Utils } from '../../../../../_utils/utils';
import { ConfigService } from '../../../../../_services/config.service';
import { XtraValidators } from '../../../../../_utils/xtra-validators';

@UntilDestroy()
@Component({
  selector: 'app-domain-install',
  templateUrl: './domain-install.component.html'
})
export class DomainInstallComponent implements OnInit {

    /** Whether the snippet options section is collapsed. */
    collapseSnippetOptions = true;

    readonly form = this.fb.nonNullable.group({
        autoInit:    true,
        liveUpdate:  true,
        noFonts:     false,
        noCss:       false,
        lang:        '',
        cssOverride: ['', [XtraValidators.url(false)]],
        maxLevel:    [10, [Validators.min(1), Validators.max(99)]],
        pageId:      ['', Validators.maxLength(2076)], // 2083 - length of 'http://'
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
