import { Pipe, PipeTransform } from '@angular/core';
import { DomainModNotifyPolicy } from '../../../../generated-api';

@Pipe({
    name: 'moderatorNotifyPolicy'
})
export class ModeratorNotifyPolicyPipe implements PipeTransform {

    transform(value: DomainModNotifyPolicy | string | null | undefined): string {
        switch (value) {
            case DomainModNotifyPolicy.None:
                return $localize`Don't email`;
            case DomainModNotifyPolicy.Pending:
                return $localize`For comments pending moderation`;
            case DomainModNotifyPolicy.All:
                return $localize`For all new comments`;
        }
        return '';
    }
}
