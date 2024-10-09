import { IconName } from './ui-toolkit';

/**
 * Command that runs an action in the comment editor.
 */
export abstract class EditorCommand {

    /** ID of the message naming the command. */
    readonly titleId = '';

    /** Name of the icon corresponding to the command. */
    readonly icon = '' as IconName;

    /** Replacement pattern that provides rules for transforming the text or selection. */
    readonly pattern = '';

    /** Whether Ctrl has to be pressed to invoke the command. */
    readonly keyCtrl = false;

    /** Whether Meta (Cmd) has to be pressed to invoke the command. */
    readonly keyMeta = false;

    /** Whether Shift has to be pressed to invoke the command. */
    readonly keyShift = false;

    /** Whether Alt has to be pressed to invoke the command. */
    readonly keyAlt = false;

    /** Key code that has to be pressed to invoke the command. */
    readonly keyCode?: string;

    /** Name of the key that invokes the command and overrides the keyCode for keyTitle. */
    readonly keyName?: string;

    /**
     * Apply the command to the given textarea element.
     */
    abstract apply(textarea: HTMLTextAreaElement): void;

    /** Suffix with the keyboard shortcut to be used on the button title. */
    get keyTitle(): string {
        // Empty string if no shortcut defined
        if (!this.keyCode) {
            return '';
        }
        return ' ('+
            [
                this.keyCtrl  && 'Ctrl',
                this.keyMeta  && '⌘',
                this.keyShift && 'Shift',
                this.keyAlt   && 'Alt',
                this.keyName || this.keyCode.replace(/^Key|Digit/, ''),
            ]
                .filter(s => s)
                .join('+') +
            ')';
    }

    /**
     * Whether the given keyboard event matches the key combination for this command.
     */
    matchesKeyEvent(e: KeyboardEvent): boolean {
        return !!this.keyCode &&
            e.ctrlKey  === this.keyCtrl &&
            e.metaKey  === this.keyMeta &&
            e.shiftKey === this.keyShift &&
            e.altKey   === this.keyAlt &&
            e.code     === this.keyCode;
    }
}

/**
 * An "inline" command, which applies to selected text fragment.
 * Pattern rules:
 *     * `$` is replaced with the selected text, if any, or with a placeholder otherwise.
 *     * `{}` denotes the new selection boundaries. Only used when there was a selection, otherwise the inserted
 *            placeholder is selected.
 */
export class InlineEditorCommand extends EditorCommand {

    /** Text to use when no selection. */
    readonly placeholder = '';

    constructor(props?: Partial<Record<keyof InlineEditorCommand, any>>) {
        super();
        Object.assign(this, props);
    }

    override apply(textarea: HTMLTextAreaElement) {
        // Fetch the selected text
        const is1 = textarea.selectionStart, is2 = textarea.selectionEnd;
        const text = textarea.value;
        let sel = text.substring(is1, is2) || this.placeholder;
        const selLen = sel.length;

        // Parse the pattern
        const ip$ = this.pattern.indexOf('$');
        let ips1 = this.pattern.indexOf('{'), ips2 = this.pattern.indexOf('}');

        // Compose the replacement
        sel = this.pattern.substring(0, ip$) +     // Part before the '$'
            sel +                                  // The selection (or the placeholder)
            this.pattern.substring(ip$+1, ips1) +  // Part between the '$' and the '{'
            this.pattern.substring(ips1+1, ips2) + // Part between the '{' and the '}'
            this.pattern.substring(ips2+1);        // The rest of the pattern beyond the '}'

        // Calculate the new selection boundaries. If there was no selection, select the inserted placeholder
        if (is2 <= is1 + 1) {
            ips1 = is1 + ip$;
            ips2 = ips1 + selLen;
        } else {
            // Shift the selection boundaries accordingly otherwise
            ips1 += is1 + selLen - 1; // Account for the '$' (let's assume it's always left of the '{')
            ips2 += is1 + selLen - 2; // Account for '$' and '{'
        }

        // Replace the selected text with the processed pattern
        textarea.setRangeText(sel);
        textarea.setSelectionRange(ips1, ips2);
    }
}

/**
 * A "block" command, which applies to selected text lines. The pattern gets inserted at the beginning of each line.
 */
export class BlockEditorCommand extends EditorCommand {

    constructor(props?: Partial<Record<keyof BlockEditorCommand, any>>) {
        super();
        Object.assign(this, props);
    }

    override apply(textarea: HTMLTextAreaElement) {
        // Fetch the selected text
        const iStart = textarea.selectionStart;
        let text = textarea.value;
        const pLen = this.pattern.length;

        // Rewind selection start to the nearest line start
        let iPos = iStart;
        while (iPos > 0 && !['\r', '\n'].includes(text.charAt(iPos - 1))) {
            iPos--;
        }

        // Insert the pattern at every line's beginning within the selection range
        let iEnd = textarea.selectionEnd;
        do {
            text = text.substring(0, iPos) + this.pattern + text.substring(iPos);

            // Search for the next linebreak, starting after the insertion point
            if ((iPos = text.indexOf('\n', iPos + pLen)) < 0) {
                break;
            }

            // We're going to insert the pattern AFTER the linebreak
            iPos++;

            // The end position must shift as the text grows
            iEnd += pLen;
        } while (iPos < iEnd);

        // Replace the text
        textarea.value = text;

        // Set the cursor at the original position within the text
        textarea.setSelectionRange(iStart + pLen, iStart + pLen);
    }
}
