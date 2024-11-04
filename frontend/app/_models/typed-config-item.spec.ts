import { TypedConfigItem } from './typed-config-item';

describe('TypedConfigItem', () => {

    it('is created', () => {
        expect(new TypedConfigItem({key: 'foo', value: 'bar'})).toBeTruthy();
    });
});
