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
