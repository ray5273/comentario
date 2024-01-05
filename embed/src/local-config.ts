import { CommentSort } from './models';

/**
 * Comentario configuration kept in the local storage.
 */
export class LocalConfig {

    private static readonly StorageKey = 'comentario_settings';
    private _anonymousCommenting?: boolean;
    private _commentSort?: CommentSort;

    /** Whether the user has opted to comment anonymously. */
    get anonymousCommenting(): boolean | undefined {
        return this._anonymousCommenting;
    }

    set anonymousCommenting(b: boolean) {
        if (this._anonymousCommenting !== b) {
            this._anonymousCommenting = b;
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
                this._anonymousCommenting = data.anonymousCommenting;
                this._commentSort         = data.commentSort;
            } catch (e) {
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
                anonymousCommenting: this._anonymousCommenting,
                commentSort:         this._commentSort,
            }));
    }
}
