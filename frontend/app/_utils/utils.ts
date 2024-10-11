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
     * Escape all special characters in an attribute value.
     * @param v Value to escape. If null or undefined, returns an empty string.
     */
    static escapeAttrValue(v: string | null | undefined): string {
        return v
            ?.replaceAll('&',  '&amp;')
            .replaceAll('"',  '&quot;')
            .replaceAll('\'', '&#39;')
            .replaceAll('<',  '&lt;')
            .replaceAll('>',  '&gt;') ?? '';
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

    /**
     * Return a record consisting of all entries from the passed record, but sorted by key
     * @param r Input record
     */
    static sortByKey<T>(r: T): T {
        return r ?
            Object.keys(r)
                .sort()
                .reduce(
                    (acc, k) => {
                        (acc as any)[k] = (r as any)[k];
                        return acc;
                    },
                    {} as T) :
            r;
    }

    /**
     * Hash the given string and return an integer in the range [0..max-1] based on the hash.
     * @param s Input string to hash.
     * @param max Maximum number to return (exclusive).
     */
    static hashString(s: string, max: number): number {
        // Sum the string's bytes, not codepoints — just like User.ColourIndex() does on the backend, but make it more
        // "hashy"
        return new TextEncoder().encode(s).reduce((a, b) => (a * 67 + b * 31) % 2281, 0) % max;
    }
}
