import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';

export enum Severity {
    INFO    = 'info',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR   = 'error',
}

/** Toast initialisation properties. */
export type ToastInitProps = Omit<Partial<Toast>, 'id'>;

/**
 * A toast notification.
 */
export class Toast {

    /** Whether to keep the toast upon the first upcoming route change. */
    keepOnRouteChange = false;

    /** Unique toast ID. */
    readonly id = Math.random().toString(36).substring(2);

    /** Notification severity. */
    readonly severity: Severity = Severity.INFO;

    /** Optional message ID, like 'this-fish-cannot-be-fried'. */
    readonly messageId?: string;

    /** Optional message text. Must be provided if `messageId` isn't specified. */
    readonly message?: string;

    /** Optional HTTP error code. */
    readonly errorCode?: number;

    /** Optional details. */
    readonly details?: string;

    /** Optional error object. */
    readonly error?: any;

    constructor(props: ToastInitProps) {
        Object.assign(this, props);
    }
}

/**
 * Service for showing toasts for the user.
 */
@Injectable({
    providedIn: 'root',
})
export class ToastService {

    /** Observable emitting on toast list change. */
    readonly toastsChanges = new Subject<Toast[]>();

    /** Internal list of toasts. */
    private _toasts: Toast[] = [];

    constructor(router: Router) {
        // Remove toasts on route change
        router.events.subscribe(e => e instanceof NavigationStart && this.clearOnRouteChange());
    }

    /**
     * Remove all toasts.
     */
    clear(): void {
        this.setToasts([]);
    }

    /**
     * Remove the given toast from the list by its unique ID.
     * @param uid Toast ID to remove
     */
    removeByUid(uid: string) {
        this.setToasts(this._toasts.filter(t => t.id !== uid));
    }

    /**
     * Add an info toast.
     * @param propsOrMsgId Toast properties or message ID.
     */
    info(propsOrMsgId: ToastInitProps | string): void {
        this.addWithSeverity(Severity.INFO, propsOrMsgId);
    }

    /**
     * Add a success toast.
     * @param propsOrMsgId Toast properties or message ID.
     */
    success(propsOrMsgId: ToastInitProps | string): void {
        this.addWithSeverity(Severity.SUCCESS, propsOrMsgId);
    }

    /**
     * Add a warning toast.
     * @param propsOrMsgId Toast properties or message ID.
     */
    warning(propsOrMsgId: ToastInitProps | string): void {
        this.addWithSeverity(Severity.WARNING, propsOrMsgId);
    }

    /**
     * Add an error toast.
     * @param propsOrMsgId Toast properties or message ID.
     */
    error(propsOrMsgId: ToastInitProps | string): void {
        this.addWithSeverity(Severity.ERROR, propsOrMsgId);
    }

    /**
     * Insert a new toast in the beginning of the list, removing any existing toasts of the same severity.
     * @param props New toast properties.
     */
    add(props: ToastInitProps): void {
        this.setToasts([
            new Toast(props),
            ...this._toasts.filter(t => t.severity !== (props.severity || Severity.INFO))]);
    }

    /**
     * Remove all toasts that don't have `keepOnRouteChange` flag set, clear the flag for those that do.
     */
    private clearOnRouteChange(): void {
        // Remove all toasts not having the keep-on-route-change flag set, then reset the flag
        this.setToasts(this._toasts.filter(t => t.keepOnRouteChange && !(t.keepOnRouteChange = false)));
    }

    /**
     * Add a new toast at the head of the list, overriding any severity present in `propsOrMsgId`.
     * @param severity Toast severity.
     * @param propsOrMsgId Toast properties or message ID.
     */
    private addWithSeverity(severity: Severity, propsOrMsgId: ToastInitProps | string): void {
        if (typeof propsOrMsgId === 'string') {
            propsOrMsgId = {messageId: propsOrMsgId};
        }
        this.add({severity, ...propsOrMsgId});
    }

    /**
     * Store the given toast list and fire a change event.
     * @private
     */
    private setToasts(ts: Toast[]): void {
        this._toasts = ts;
        this.toastsChanges.next(ts);
    }
}
