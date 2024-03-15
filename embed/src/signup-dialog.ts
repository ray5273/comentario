import { Wrap } from './element-wrap';
import { UIToolkit } from './ui-toolkit';
import { Dialog, DialogPositioning } from './dialog';
import { SignupData, TranslateFunc } from './models';
import { InstanceConfig } from './config';

export class SignupDialog extends Dialog {

    private _name?: Wrap<HTMLInputElement>;
    private _website?: Wrap<HTMLInputElement>;
    private _email?: Wrap<HTMLInputElement>;
    private _pwd?: Wrap<HTMLInputElement>;

    private constructor(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, private readonly config: InstanceConfig) {
        super(t, parent, t('dlgTitleCreateAccount'), pos);
    }

    /**
     * Instantiate and show the dialog. Return a promise that resolves as soon as the dialog is closed.
     * @param t Function for obtaining translated messages.
     * @param parent Parent element for the dialog.
     * @param pos Positioning options.
     * @param config Comentario configuration obtained from the backend.
     */
    static run(t: TranslateFunc, parent: Wrap<any>, pos: DialogPositioning, config: InstanceConfig): Promise<SignupDialog> {
        const dlg = new SignupDialog(t, parent, pos, config);
        return dlg.run(dlg);
    }

    /**
     * Entered data.
     */
    get data(): SignupData {
        return {
            email:      this._email?.val   || '',
            name:       this._name?.val    || '',
            password:   this._pwd?.val     || '',
            websiteUrl: this._website?.val || '',
        };
    }

    override renderContent(): Wrap<any> {
        // Create inputs
        this._email   = UIToolkit.input('email',    'email',    this.t('fieldEmail'),      'email',            true).attr({minlength: '6', maxlength: '254'});
        this._name    = UIToolkit.input('name',     'text',     this.t('fieldRealName'),   'name',             true).attr({pattern: '^.{2,63}$', maxlength: '63'});
        this._pwd     = UIToolkit.input('password', 'password', this.t('fieldPassword'),   'current-password', true).attr({pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*[\\d\\W]).{8,63}$', maxlength: '63'});
        this._website = UIToolkit.input('website',  'url',      this.t('fieldWebsiteOpt'), 'url')                   .attr({minlength: '8', maxlength: '2083'});

        // Add the inputs to a new form
        return UIToolkit.form(() => this.dismiss(true), () => this.dismiss())
            .append(
                UIToolkit.div('input-group').append(this._email),
                UIToolkit.div('input-group').append(this._name),
                UIToolkit.div('input-group').append(this._pwd),
                UIToolkit.div('form-text').inner(this.t('pwdStrengthExplained')),
                UIToolkit.div('input-group').append(this._website),
                UIToolkit.div('dialog-centered')
                    .append(
                        UIToolkit.span().inner(this.t('signUpAgreeTo') + ' '),
                        UIToolkit.a(this.t('signUpAgreeTerms'), this.config.statics.termsOfServiceUrl)
                            .append(UIToolkit.icon('newTab').classes('ms-1')),
                        UIToolkit.span().inner(' ' + this.t('signUpAgreeAnd') + ' '),
                        UIToolkit.a(this.t('signUpAgreePrivacyPolicy'), this.config.statics.privacyPolicyUrl)
                            .append(UIToolkit.icon('newTab').classes('ms-1')),
                        UIToolkit.span().inner('.')),
                UIToolkit.div('dialog-centered').append(UIToolkit.submit(this.t('actionSignUp'), false)),
            );
    }

    override onShow(): void {
        this._email?.focus();
    }
}
