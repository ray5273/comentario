import { ApiService } from './api';
import { TranslateFunc } from './models';

export class I18nService {

    /**
     * Get a translated message for the given ID.
     * @param id ID to get a message for.
     */
    readonly t: TranslateFunc = (id: string) => this.messages.get(id) || `![${id}]`;

    /** Messages for i18n in the current language. */
    private readonly messages = new Map<string, string>();

    /**
     * Whether the service has been successfully initialised.
     */
    get initialised(): boolean {
        return !!this.messages.size;
    }

    constructor(private readonly api: ApiService) {}

    /**
     * Initialise the service with the given language.
     * @param lang Language ID to use. If not provided or not recognised, the default UI language will be used as
     * fallback.
     */
    async init(lang: string | null | undefined): Promise<void> {
        const ms = await this.api.i18nMessages(lang);
        this.messages.clear();
        Object.entries(ms).forEach(([id, translation]) => this.messages.set(id, translation));
    }
}
