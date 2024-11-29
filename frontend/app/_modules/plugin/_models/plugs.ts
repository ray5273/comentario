/** An easy-to-consume data structure describing a UI plug. */
export interface UIPlug {
    /** ID of the plugin. */
    pluginId: string;
    /** Plugin's path. */
    pluginPath: string;
    /** Location of the plug. */
    location: string;
    /** Plug's label in the current language. */
    label: string;
    /** Plug's component tag. */
    componentTag: string;
    /** Plug's path. */
    path: string;
}
