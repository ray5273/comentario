import { Pipe, PipeTransform } from '@angular/core';
import { CommentSort } from '../../../../generated-api';

@Pipe({
    name: 'commentSort',
})
export class CommentSortPipe implements PipeTransform {

    transform(value: CommentSort | string | null | undefined): string {
        switch (value) {
            case CommentSort.Ta:
                return $localize`Oldest first`;
            case CommentSort.Td:
                return $localize`Newest first`;
            case CommentSort.Sa:
                return $localize`Least upvoted first`;
            case CommentSort.Sd:
                return $localize`Most upvoted first`;
        }
        return '';
    }
}
