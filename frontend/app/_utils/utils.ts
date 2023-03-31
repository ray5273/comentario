export class Utils {

    /**
     * Whether the passed value is a 64-hex-digit token.
     */
    static isHexToken(v: any): boolean {
        return typeof v === 'string' && !!v.match(/^[\da-f]{64}$/);
    }
}
