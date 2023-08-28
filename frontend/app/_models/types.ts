/**
 * Turns every property of T into a mutable one.
 */
export type Mutable<T> = { -readonly [P in keyof T ]: T[P] };
