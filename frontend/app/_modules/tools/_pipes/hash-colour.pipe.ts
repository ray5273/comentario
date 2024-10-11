import { Pipe, PipeTransform } from '@angular/core';
import { Utils } from '../../../_utils/utils';

/**
 * A pipe that accepts a string value and hashes it, or a colour index directly, and returns an HTML colour based on the hash value.
 */
@Pipe({
    name: 'hashColour',
})
export class HashColourPipe implements PipeTransform {

    // Colour array identical to the $colourise-map from embed/scss/_colours.scss
    static readonly Colours = [
        '#ff6b6b',
        '#fa5252',
        '#f03e3e',
        '#e03131',
        '#c92a2a',
        '#f06595',
        '#e64980',
        '#d6336c',
        '#c2255c',
        '#a61e4d',
        '#cc5de8',
        '#be4bdb',
        '#ae3ec9',
        '#9c36b5',
        '#862e9c',
        '#845ef7',
        '#7950f2',
        '#7048e8',
        '#6741d9',
        '#5f3dc4',
        '#5c7cfa',
        '#4c6ef5',
        '#4263eb',
        '#3b5bdb',
        '#364fc7',
        '#686fe8',
        '#5b62e5',
        '#4950d8',
        '#1922c2',
        '#181fab',
        '#22b8cf',
        '#15aabf',
        '#1098ad',
        '#0c8599',
        '#0b7285',
        '#20c997',
        '#12b886',
        '#0ca678',
        '#099268',
        '#087f5b',
        '#51cf66',
        '#40c057',
        '#37b24d',
        '#2f9e44',
        '#2b8a3e',
        '#94d82d',
        '#82c91e',
        '#74b816',
        '#66a80f',
        '#5c940d',
        '#fcc419',
        '#fab005',
        '#f59f00',
        '#f08c00',
        '#e67700',
        '#ff922b',
        '#fd7e14',
        '#f76707',
        '#e8590c',
        '#d9480f',
    ];

    /** Colour to be used when no (truthy) value is provided. */
    static readonly DefaultColour = '#c3c3c3';

    transform(value?: any): string {
        // If there's no truthy value given, except 0, return the default colour
        const isNumber = typeof value === 'number' && !isNaN(value);
        if (!isNumber && !value) {
            return HashColourPipe.DefaultColour;
        }

        const max = HashColourPipe.Colours.length;

        // If a number is given, consider it an index, capping it at the max
        const idx = isNumber ?
            Math.floor(value) % max :
            // Not a number: calculate a "hash", coercing the value into a string
            Utils.hashString(String(value), max);

        // Pick a colour based on the calculated index
        return HashColourPipe.Colours[idx];
    }
}
