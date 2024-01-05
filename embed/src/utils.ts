export class Utils {

    static readonly reUuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

    /** When running under Cypress, cookies are stored on the parent document. */
    static readonly cookieSrc = (parent as any)['Cypress'] ? parent.document : document;

    /**
     * Return whether the passed value represents a valid UUID.
     * @param v Value to check.
     */
    static isUuid(v: any): boolean {
        return typeof v === 'string' && !!v.match(this.reUuid);
    }

    /**
     * Return a string representation of a time difference in the "time ago" notation.
     * @param current Current time in milliseconds.
     * @param previous The past moment in milliseconds.
     */
    static timeAgo(current: number, previous: number): string {
        const seconds = Math.floor((current-previous) / 1000);

        // Years
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) {
            return `${interval} years ago`;
        }
        if (interval === 1) {
            return 'A year ago';
        }

        // Months
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return `${interval} months ago`;
        }
        if (interval === 1) {
            return 'A month ago';
        }

        // Days
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return `${interval} days ago`;
        }
        if (interval === 1) {
            return 'Yesterday';
        }

        // Hours
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return `${interval} hours ago`;
        }
        if (interval === 1) {
            return 'An hour ago';
        }

        // Minutes
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return `${interval} minutes ago`;
        }
        if (interval === 1) {
            return 'A minute ago';
        }

        // Less than a minute
        return 'Just now';
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
     * Return the value of a document cookie with the given name.
     * @param name Name of the cookie.
     */
    static getCookie(name: string): string | undefined {
        return `; ${this.cookieSrc.cookie}`.split(`; ${name}=`).pop()?.split(';').shift() || undefined;
    }

    /**
     * Set a document cookie with the given name and value.
     * @param name Name of the cookie to set.
     * @param value Value of the cookie.
     * @param days Number of days for the cookie to stay valid.
     */
    static setCookie(name: string, value: string | null | undefined, days: number) {
        const exp = new Date();
        exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
        this.cookieSrc.cookie = `${name}=${value || ''}; Expires=${exp.toUTCString()}; Path=/; SameSite=Strict`;
    }
}
