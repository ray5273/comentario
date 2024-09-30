import { PluginConfig, PluginUIPlugConfig } from '../../generated-api';

/**
 * An UI language.
 */
export interface Language {
    /** Name of the language in that language. */
    nativeName: string;
    /** Language tag. */
    code: string;
    /** Language weight to order languages by. */
    weight: number;
    /** Date format for the language. */
    dateFormat: string;
    /** Datetime format for the language. */
    datetimeFormat: string;
}

/**
 * Data associated with a plugin route.
 */
export interface PluginRouteData {
    plugin: PluginConfig;
    plug:   PluginUIPlugConfig;
}
