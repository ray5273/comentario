import { CommentSort, DynamicConfigItem, InstanceStaticConfig } from './models';
import { ApiConfigResponse } from './api';
import { Utils } from './utils';

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

/**
 * Wrapper around the dynamic instance config, with some convenience methods.
 */
export class DynamicConfig {

    constructor(
        private readonly cfg?: Map<string, DynamicConfigItem>,
    ) {}

    get enableCommentDeletionAuthor(): boolean {
        return this.getBool('domain.defaults.comments.deletion.author');
    }

    get enableCommentDeletionModerator(): boolean {
        return this.getBool('domain.defaults.comments.deletion.moderator');
    }

    get enableCommentEditingAuthor(): boolean {
        return this.getBool('domain.defaults.comments.editing.author');
    }

    get enableCommentEditingModerator(): boolean {
        return this.getBool('domain.defaults.comments.editing.moderator');
    }

    get enableCommentVoting(): boolean {
        return this.getBool('domain.defaults.comments.enableVoting');
    }

    get imagesEnabled(): boolean {
        return this.getBool('markdown.images.enabled');
    }

    get linksEnabled(): boolean {
        return this.getBool('markdown.links.enabled');
    }

    get localSignupEnabled(): boolean {
        return this.getBool('domain.defaults.signup.enableLocal');
    }

    get showDeletedComments(): boolean {
        return this.getBool('domain.defaults.comments.showDeleted');
    }

    get tablesEnabled(): boolean {
        return this.getBool('markdown.tables.enabled');
    }

    getBool(key: string): boolean {
        return this.cfg?.get(key)?.value === 'true';
    }
}

/** Instance configuration. */
export class InstanceConfig {

    constructor(
        /** Static config (named "statics" to avoid a clash with the "static" keyword). */
        readonly statics: InstanceStaticConfig,
        /** Dynamic config. */
        readonly dynamic: DynamicConfig,
    ) {}

    /**
     * Instantiates and returns a new default instance config.
     */
    static default() {
        return new this(
            {
                baseUrl:           'https://comentario.app',
                baseDocsUrl:       'https://docs.comentario.app',
                termsOfServiceUrl: '',
                privacyPolicyUrl:  '',
                version:           '',
                buildDate:         '',
                serverTime:        '',
                defaultLangId:     'en',
                homeContentUrl:    'https://docs.comentario.app/en/embed/front-page/',
                resultPageSize:    25,
                liveUpdateEnabled: false,
            },
            new DynamicConfig());
    }

    /**
     * Instantiates and returns a new instance config based on the provided API response.
     */
    static of(r: ApiConfigResponse) {
        return new this(
            r.staticConfig,
            // Convert the config item array into a map
            new DynamicConfig(new Map(r.dynamicConfig?.map(i => [i.key, i]))));
    }

    /**
     * Build a documentation URL from the provided parts.
     * @param parts
     */
    docsUrl(...parts: string[]): string {
        return Utils.joinUrl(this.statics.baseDocsUrl, this.statics.defaultLangId, ...parts);
    }
}
