import { DomainConfigItemKey, DynamicConfig, InstanceConfigItemKey } from './config';

describe('DynamicConfig', () => {

    it('is created without items', () => {
        const cfg = new DynamicConfig();
        expect(cfg.byKey).toEqual({});
        expect(cfg.bySection).toEqual({});
    });

    it('sorts and maps items', () => {
        const cfg = new DynamicConfig([
            {key: 'foo', value: '10', section: 'one'},
            {key: 'bar', value: '20', section: 'one'},
            {key: 'baz', value: '30', section: 'three'},
            {key: 'bax', value: '33', section: 'three'},
            {key: 'bay', value: '35', section: 'three'},
            {key: 'buz', value: '40', section: 'two'},
            {key: 'far', value: '50', section: 'one'},
        ]);

        // Verify items by key
        expect(cfg.byKey).toEqual({
            bar: jasmine.objectContaining({key: 'bar', value: '20', section: 'one'}),
            bax: jasmine.objectContaining({key: 'bax', value: '33', section: 'three'}),
            bay: jasmine.objectContaining({key: 'bay', value: '35', section: 'three'}),
            baz: jasmine.objectContaining({key: 'baz', value: '30', section: 'three'}),
            buz: jasmine.objectContaining({key: 'buz', value: '40', section: 'two'}),
            far: jasmine.objectContaining({key: 'far', value: '50', section: 'one'}),
            foo: jasmine.objectContaining({key: 'foo', value: '10', section: 'one'}),
        });

        // Verify section order, and orders within sections
        expect(Object.keys(cfg.bySection)).toEqual(['one', 'three', 'two']);
        expect(cfg.bySection.one  .map(i => i.key)).toEqual(['bar', 'far', 'foo']);
        expect(cfg.bySection.three.map(i => i.key)).toEqual(['bax', 'bay', 'baz']);
        expect(cfg.bySection.two  .map(i => i.key)).toEqual(['buz']);

        // Verify items by section
        expect(cfg.bySection).toEqual({
            one: [
                jasmine.objectContaining({key: 'bar', value: '20', section: 'one'}),
                jasmine.objectContaining({key: 'far', value: '50', section: 'one'}),
                jasmine.objectContaining({key: 'foo', value: '10', section: 'one'}),
            ],
            three: [
                jasmine.objectContaining({key: 'bax', value: '33', section: 'three'}),
                jasmine.objectContaining({key: 'bay', value: '35', section: 'three'}),
                jasmine.objectContaining({key: 'baz', value: '30', section: 'three'}),
            ],
            two: [
                jasmine.objectContaining({key: 'buz', value: '40', section: 'two'}),
            ],
        });
    });

    it('returns item by key', () => {
        const i1 = {key: DomainConfigItemKey.commentDeletionAuthor, value: 'x'};
        const i2 = {key: InstanceConfigItemKey.authSignupEnabled,   value: 'y'};
        const cfg = new DynamicConfig([i1, i2]);
        expect(cfg.get(DomainConfigItemKey.commentDeletionAuthor))  .toEqual(jasmine.objectContaining(i1));
        expect(cfg.get(InstanceConfigItemKey.authSignupEnabled))    .toEqual(jasmine.objectContaining(i2));
        expect(cfg.get(InstanceConfigItemKey.authSignupConfirmUser)).toBeUndefined();
    });
});

