import { animate, AnimationTriggerMetadata, style, transition, trigger } from '@angular/animations';

/**
 * Reusable animations.
 */
export class Animations {

    static readonly DURATION_FAST = '150ms';
    static readonly DURATION_SLOW = '500ms';

    /**
     * Animation trigger that makes an element appearing in the DOM to fade in.
     */
    static fadeIn(speed: 'fast' | 'slow'): AnimationTriggerMetadata {
        const d = speed === 'fast' ? this.DURATION_FAST : this.DURATION_SLOW;
        return trigger(`fadeIn-${speed}`, [
            transition(':enter', [style({opacity: 0}), animate(d, style({opacity: 1}))]),
        ]);
    }

    /**
     * Animation trigger that makes an element appearing in/disappearing from the DOM to correspondingly fade in or out.
     */
    static fadeInOut(speed: 'fast' | 'slow'): AnimationTriggerMetadata {
        const d = speed === 'fast' ? this.DURATION_FAST : this.DURATION_SLOW;
        return trigger(`fadeInOut-${speed}`, [
            transition(':enter', [style({opacity: 0}), animate(d, style({opacity: 1}))]),
            transition(':leave', [animate(d, style({opacity: 0}))]),
        ]);
    }
}
