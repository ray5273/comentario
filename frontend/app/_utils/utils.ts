import { AbstractControl } from '@angular/forms';

export class Utils {

    static readonly ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';

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

    /**
     * Join the given parts with a slash, making sure there's only a single slash between them.
     * @param parts Parts to join.
     */
    static joinUrl(...parts: string[]): string {
        return parts.reduce(
            (a, b) => {
                // First iteration
                if (!a) {
                    return b;
                }

                // Chop off any trailing '/' from a
                if (a.endsWith('/')) {
                    a = a.substring(0, a.length - 1);
                }

                // Chop off any leading '/' from b
                if (b.startsWith('/')) {
                    b = b.substring(1);
                }

                // Join them
                return `${a}/${b}`;
            },
            '');
    }
}
