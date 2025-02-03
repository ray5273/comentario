import { Wrap } from './element-wrap';

export type IconName = keyof typeof SVG_ICONS;

/**
 * Known SVG icons, inlined, all having a 16x16 px viewbox.
 */
const SVG_ICONS = {
    arrowDown:     '<path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"/>',
    arrowUp:       '<path fill-rule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"/>',
    bin:           '<path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>',
    bold:          '<path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/>',
    bulletList:    '<path d="M2 7c1.333 0 1.333-2 0-2S.667 7 2 7m0 4c1.333 0 1.333-2 0-2s-1.333 2 0 2m3-5.5h10v1H5zm0 4h10v1H5z"/>',
    caretDown:     '<path d="M8 12 0 4h16z"/>',
    check:         '<path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>',
    code:          '<path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0m6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0"/>',
    enter:         '<path fill-rule="evenodd" d="M14.5 1.5a.5.5 0 0 1 .5.5v4.8a2.5 2.5 0 0 1-2.5 2.5H2.707l3.347 3.346a.5.5 0 0 1-.708.708l-4.2-4.2a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 8.3H12.5A1.5 1.5 0 0 0 14 6.8V2a.5.5 0 0 1 .5-.5"/>',
    exit:          '<path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>',
    gear:          '<path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>',
    help:          '<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.496 6.033h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286a.237.237 0 0 0 .241.247m2.325 6.443c.61 0 1.029-.394 1.029-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94 0 .533.425.927 1.01.927z"/>',
    image:         '<path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/><path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54L1 12.5v-9a.5.5 0 0 1 .5-.5z"/>',
    italic:        '<path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/>',
    link:          '<path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/><path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>',
    lock:          '<path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>',
    newTab:        '<path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/><path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>',
    numberedList:  '<path d="M5 9.333h10v1H5zm-3.291.166h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054v.507H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338zm.855-2.166h-.635V5.257h-.031l-.598.42V5.11l.629-.443h.635zm2.436-2h10v1H5z"/>',
    pencil:        '<path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>',
    quote:         '<path d="M6.75 4.876A2.993 2.993 0 0 0 1.24 6.508a2.997 2.997 0 0 0 4.604 2.528c-.236.699-.675 1.445-1.397 2.193a.75.75 0 0 0 1.078 1.042C8.196 9.503 7.85 6.494 6.75 4.88zm7.19 0a2.993 2.993 0 0 0-5.51 1.632 2.997 2.997 0 0 0 4.603 2.528c-.235.699-.674 1.445-1.397 2.193a.75.75 0 0 0 1.079 1.042c2.671-2.768 2.324-5.777 1.226-7.392z"/>',
    reply:         '<path d="M5.921 11.9 1.353 8.62a.72.72 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719V6c1.5 0 6 0 7 8-2.5-4.5-7-4-7-4v1.281c0 .56-.606.898-1.079.62z"/>',
    star:          '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>',
    strikethrough: '<path d="M6.333 5.686c0 .31.083.581.27.814H5.166a2.8 2.8 0 0 1-.099-.76c0-1.627 1.436-2.768 3.48-2.768 1.969 0 3.39 1.175 3.445 2.85h-1.23c-.11-1.08-.964-1.743-2.25-1.743-1.23 0-2.18.602-2.18 1.607zm2.194 7.478c-2.153 0-3.589-1.107-3.705-2.81h1.23c.144 1.06 1.129 1.703 2.544 1.703 1.34 0 2.31-.705 2.31-1.675 0-.827-.547-1.374-1.914-1.675L8.046 8.5H1v-1h14v1h-3.504c.468.437.675.994.675 1.697 0 1.826-1.436 2.967-3.644 2.967"/>',
    table:         '<path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm15 2h-4v3h4zm0 4h-4v3h4zm0 4h-4v3h3a1 1 0 0 0 1-1zm-5 3v-3H6v3zm-5 0v-3H1v2a1 1 0 0 0 1 1zm-4-4h4V8H1zm0-4h4V4H1zm5-3v3h4V4zm4 4H6v3h4z"/>',
    times:         '<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>',
    unlock:        '<path d="M11 1a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V3a3 3 0 0 1 6 0v4a.5.5 0 0 1-1 0V3a2 2 0 0 0-2-2"/>',
};

/**
 * Utility class to facilitate the creation of various UI components.
 */
export class UIToolkit {

    // noinspection JSDeprecatedSymbols
    /**
     * Whether we're running on a Mac. `platform` is technically deprecated, but there's no real alternative at the
     * moment so keep it that way.
     */
    static readonly isMac = navigator.platform.toLowerCase().includes('mac');

    /**
     * Create and return a new link (anchor) element.
     * @param text Link text.
     * @param href Href of the anchor.
     * @param options Options for the link
     */
    static a(text: string, href: string, options: {noFollow?: boolean; noOpener?: boolean; noReferrer?: boolean} = {noOpener: true}): Wrap<HTMLAnchorElement> {
        const rel = [];
        if (options.noFollow) {
            rel.push('nofollow');
        }
        if (options.noOpener) {
            rel.push('noopener');
        }
        if (options.noReferrer) {
            rel.push('noreferrer');
        }
        return Wrap.new('a').inner(text).attr({href, target: '_blank', rel: rel.join(' ')});
    }

    /**
     * Create and return a new div element.
     * @param classes Classes to add to the div.
     */
    static div(...classes: (false | null | undefined | string)[]): Wrap<HTMLDivElement> {
        return Wrap.new('div').classes(...classes);
    }

    /**
     * Create and return a new span element.
     * @param text Optional inner text.
     * @param classes Classes to add to the span.
     */
    static span(text?: string, ...classes: (false | null | undefined | string)[]): Wrap<HTMLSpanElement> {
        return Wrap.new('span').inner(text ?? '').classes(...classes);
    }

    /**
     * Create and return a new badge element.
     * @param text Badge text
     * @param classes Classes to add to the div.
     */
    static badge(text: string, ...classes: (false | null | undefined | string)[]): Wrap<HTMLDivElement> {
        return UIToolkit.div('badge').classes(...classes).inner(text);
    }

    /**
     * Create and return a new popup dialog element.
     * @param onSubmit Form submit handler.
     * @param onCancel Form cancel handler (triggered when the user presses Esc).
     */
    static form(onSubmit: () => void, onCancel?: () => void): Wrap<HTMLFormElement> {
        const submit = (f: Wrap<HTMLFormElement>, e: Event) => {
            // Prevent default handling
            e.preventDefault();

            // Mark all inputs touched to show their validation
            [...f.element.getElementsByTagName('input'), ...f.element.getElementsByTagName('textarea')]
                .forEach(el => new Wrap(el).classes('touched'));

            // Run the submit handler if the form is valid
            if (f.element.checkValidity()) {
                onSubmit();
            }
        };
        const cancel = (e: Event) => {
            // If there's a cancel handler provided
            if (onCancel) {
                e.preventDefault();
                onCancel();
            }
        };
        return Wrap.new('form')
            // Intercept form submit event
            .on('submit', submit)
            // Submit the form on Ctrl+Enter and cancel with Esc
            .on('keydown', (f, e) => {
                switch (e.code) {
                    case 'Enter':
                        // Mac OS requires pressing Cmd (= Meta), all others Ctrl
                        return (this.isMac !== e.ctrlKey) && (this.isMac === e.metaKey) &&
                            !e.shiftKey &&
                            !e.altKey &&
                            submit(f, e);
                    case 'Escape':
                        return !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && cancel(e);
                }
            });
    }

    /**
     * Create and return a new input element.
     */
    static input(name: string, type = 'text', placeholder: string | null | undefined = null, autocomplete: string | null | undefined = null, required?: boolean): Wrap<HTMLInputElement> {
        return Wrap.new('input')
            .classes('input')
            .attr({name, type, placeholder, autocomplete, required: required ? 'required' : null, size: '1'})
            // Add the touched class on blur, which is used to highlight invalid input
            .on('blur', t => t.classes('touched'));
    }

    /**
     * Create and return a new textarea element.
     */
    static textarea(placeholder:  null | undefined | string, required: boolean, autoExpand: boolean): Wrap<HTMLTextAreaElement> {
        return Wrap.new('textarea')
            .attr({placeholder, required: required ? 'required' : null})
            // Add the touched class on blur, which is used to highlight invalid input
            .on('blur', t => t.classes('touched'))
            // Enable automatic height adjusting on input, if needed
            .on('input', t =>
                autoExpand &&
                t.style('height:auto')
                    .style(`height:${Math.min(Math.max(t.element.scrollHeight + t.element.offsetHeight - t.element.clientHeight, 75), 400)}px`));
    }

    /**
     * Create and return a new button element.
     * @param label Label of the button (HTML).
     * @param onClick Button's click handler.
     * @param classes Additional button classes to add.
     */
    static button(label: string, onClick?: (btn: Wrap<HTMLButtonElement>, e: MouseEvent) => void,  ...classes: (false | null | undefined | string)[]): Wrap<HTMLButtonElement> {
        return Wrap.new('button').classes('btn', ...classes).html(label).attr({type: 'button'}).click(onClick);
    }

    /**
     * Create and return a new button with an icon inside.
     * @param icon Icon in the button.
     * @param title Optional title of the button.
     * @param onClick Button's click handler.
     * @param classes Additional button classes to add.
     */
    static iconButton(icon: IconName, title: string, onClick?: (btn: Wrap<HTMLButtonElement>, e: MouseEvent) => void,  ...classes: (false | null | undefined | string)[]): Wrap<HTMLButtonElement> {
        return this.button('', onClick, ...classes).append(this.icon(icon)).attr({title});
    }

    /**
     * Create and return a new tool button with an icon.
     * @param icon Icon in the button.
     * @param title Optional title of the button.
     * @param onClick Button's click handler.
     * @param classes Additional button classes to add.
     */
    static toolButton(icon: IconName, title: string, onClick: (btn: Wrap<HTMLButtonElement>, e: MouseEvent) => void,  ...classes: (false | null | undefined | string)[]): Wrap<HTMLButtonElement> {
        return this.iconButton(icon, title, onClick, 'btn-tool', ...classes).attr({tabindex: '-1'});
    }

    /**
     * Create and return a new submit button element.
     * @param title Title of the button, and, if iconOnly is false, also its label.
     * @param iconOnly Whether to draw a "carriage return" icon instead of text.
     */
    static submit(title: string, iconOnly: boolean): Wrap<HTMLButtonElement> {
        const btn = Wrap.new('button').classes('btn', 'btn-primary', 'fw-bold').attr({type: 'submit'});
        return iconOnly ?
            btn.append(this.icon('enter').classes('submit-icon')).attr({title}) :
            btn.inner(title);
    }

    /**
     * Create and return an SVG element for the specified named icon.
     */
    static icon(icon: IconName): Wrap<SVGElement> {
        return Wrap.newSvg().attr({fill: 'currentColor', viewBox: '0 0 16 16'}).classes('icon').html(SVG_ICONS[icon]);
    }
}
