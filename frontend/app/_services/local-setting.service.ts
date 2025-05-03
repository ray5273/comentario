import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Service that provides a functional interface to the browser's localStorage.
 */
@Injectable({
    providedIn: 'root',
})
export class LocalSettingService {

    /**
     * Save the given value under the specified key.
     * @param key Key to store the value under.
     * @param v Value to store.
     */
    storeValue<T>(key: string, v: T) {
        if (v) {
            localStorage.setItem(key, JSON.stringify(v));
        } else {
            localStorage.removeItem(key);
        }
    }

    /**
     * Restore a previously saved value with the specified key, or the default value, if there's none or an error
     * occurred.
     * @param key Key to retrieve from the storage.
     * @param defaultValue Default value to apply whenever reading fails or no value was found.
     */
    restoreValue<T>(key: string, defaultValue?: T): T | undefined {
        const s = localStorage.getItem(key);
        if (s) {
            try {
                return JSON.parse(s);
            } catch {
                // Ignore
            }
        }

        // Return the default
        return defaultValue;
    }

    /**
     * The same as `restoreValue`, but returns the result as a one-off Observable.
     * @param key Key to retrieve from the storage.
     * @param defaultValue Default value to apply whenever reading fails or no value was found.
     */
    load<T>(key: string, defaultValue?: T): Observable<T | undefined> {
        return of(this.restoreValue<T>(key, defaultValue));
    }
}
