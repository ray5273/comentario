import { CommentSort } from './models';

/**
 * Comentario configuration kept in the local storage.
 */
export class LocalConfig {

    private static readonly StorageKey = 'comentario_settings';
    private _unregisteredCommenting?: boolean;
    private _unregisteredName?: string;
    private _commentSort?: CommentSort;

    /** Whether the user has opted to comment without registration. */
    get unregisteredCommenting(): boolean | undefined {
        return this._unregisteredCommenting;
    }

    /** Optional name of the user, in case they opted to comment without registration. */
    get unregisteredName(): string | undefined {
        return this._unregisteredName;
    }

    setUnregisteredCommenting(b: boolean, name?: string) {
        if (this._unregisteredCommenting !== b || this._unregisteredName !== name) {
            this._unregisteredCommenting = b;
            this._unregisteredName       = b ? name : undefined;
            this.save();
        }
    }

    /** User-chosen comment sort order. */
    get commentSort(): CommentSort | undefined {
        return this._commentSort;
    }

    set commentSort(s: CommentSort) {
        if (this._commentSort !== s) {
            this._commentSort = s;
            this.save();
        }
    }

    /**
     * Loads the config from the local storage.
     */
    load() {
        const s = localStorage.getItem(LocalConfig.StorageKey);
        if (s) {
            try {
                const data = JSON.parse(s);
                this._unregisteredCommenting = data.unregisteredCommenting;
                this._unregisteredName       = data.unregisteredName;
                this._commentSort            = data.commentSort;
            } catch {
                // Ignore
            }
        }

    }

    /**
     * Stores the config in the local storage.
     */
    save() {
        localStorage.setItem(
            LocalConfig.StorageKey,
            JSON.stringify({
                unregisteredCommenting: this._unregisteredCommenting,
                unregisteredName:       this._unregisteredName,
                commentSort:            this._commentSort,
            }));
    }
}
