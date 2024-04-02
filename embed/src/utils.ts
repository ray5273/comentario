import { TranslateFunc } from './models';

export class Utils {

    static readonly reUuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

    /** When running under Cypress, cookies are stored on the parent document. */
    static readonly cookieSrc = (parent as any)['Cypress'] ? parent.document : document;

    /**
     * Return whether the passed value is a non-zero date.
     * @param v Value to check.
     */
    static isDateString(v: any): boolean {
        return typeof v === 'string' &&
            v.length >= 10 && // yyyy-mm-dd
            !v.startsWith('0001'); // Backend renders zero date as '0001-01-01T00:00:00.000Z'
    }

    /**
     * Return whether the passed value represents a valid UUID.
     * @param v Value to check.
     */
    static isUuid(v: any): boolean {
        return typeof v === 'string' && !!v.match(this.reUuid);
    }

    /**
     * Return a string representation of a time difference in the "time ago" notation.
     * @param t Function for obtaining translated messages.
     * @param current Current time in milliseconds.
     * @param previous The past moment in milliseconds.
     */
    static timeAgo(t: TranslateFunc, current: number, previous: number): string {
        const seconds = Math.floor((current-previous) / 1000);

        // Years
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) {
            return `${interval} ${t('timeYearsAgo')}`;
        }
        if (interval === 1) {
            return t('timeYearAgo');
        }

        // Months
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) {
            return `${interval} ${t('timeMonthsAgo')}`;
        }
        if (interval === 1) {
            return t('timeMonthAgo');
        }

        // Days
        interval = Math.floor(seconds / 86400);
        if (interval > 1) {
            return `${interval} ${t('timeDaysAgo')}`;
        }
        if (interval === 1) {
            return t('timeYesterday');
        }

        // Hours
        interval = Math.floor(seconds / 3600);
        if (interval > 1) {
            return `${interval} ${t('timeHoursAgo')}`;
        }
        if (interval === 1) {
            return t('timeHourAgo');
        }

        // Minutes
        interval = Math.floor(seconds / 60);
        if (interval > 1) {
            return `${interval} ${t('timeMinutesAgo')}`;
        }
        if (interval === 1) {
            return t('timeMinuteAgo');
        }

        // Less than a minute
        return t('timeJustNow');
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
