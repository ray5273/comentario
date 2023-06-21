import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class LocalSettingService {

    /**
     * Save the given value under the specified key.
     */
    storeValue<T>(key: string, v: T) {
        if (v) {
            localStorage.setItem(key, JSON.stringify(v));
        } else {
            localStorage.removeItem(key);
        }
    }

    /**
     * Restore a previously saved value with the specified key, or the default value, if there's none or an error occurred.
     */
    restoreValue<T>(key: string, defaultValue?: T): T | undefined {
        const s = localStorage.getItem(key);
        if (s) {
            try {
                return JSON.parse(s);
            } catch (e) {
                // Ignore
            }
        }

        // Return the default
        return defaultValue;
    }
}
