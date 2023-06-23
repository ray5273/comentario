import { AbstractControl } from '@angular/forms';

export class Utils {

    /**
     * Enable or disable controls based on the boolean value.
     * @param enable Whether to enable controls.
     * @param ctl Controls to enable/disable.
     */
    static enableControls(enable: boolean, ...ctl: AbstractControl[]): void {
        if (enable) {
            ctl.forEach(c => c.enable());
        } else {
            ctl.forEach(c => c.disable());
        }
    }

    /**
     * Whether the passed value is a 64-hex-digit token.
     */
    static isHexToken(v: any): boolean {
        return typeof v === 'string' && !!v.match(/^[\da-f]{64}$/);
    }
}
