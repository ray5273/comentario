import { DomainConfigKey, DOMAINS, TEST_PATHS, USERS } from '../../support/cy-utils';
import { EmbedUtils } from '../../support/cy-embed-utils';

context('Comment card', () => {

    const commentsAnon =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        `;
    const commentsComm =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply]
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        `;
    const commentsCommNoDel =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply]
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        `;
    const commentsCommNoEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply]
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        - buttons: [Upvote, Downvote, Reply]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        `;
    const commentsAceNoModDel =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        `;
    const commentsAceNoModEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        `;
    const commentsAceNoModDelEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply]
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        `;
    const commentsKingNoModDel =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit]
            - buttons: [Upvote, Downvote, Reply, Edit]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit]
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit]
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit]
        `;
    const commentsKingNoModEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Delete]
            - buttons: [Upvote, Downvote, Reply, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Delete]
        - buttons: [Upvote, Downvote, Reply, Sticky, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Delete]
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Delete]
        `;
    const commentsKingNoModDelEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        - buttons: [Upvote, Downvote, Reply, Sticky]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        `;
    const commentsRoot =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
          - buttons: [Upvote, Downvote, Reply, Edit, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit, Delete]
        `;
    const commentsRootNoDel =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit]
            - buttons: [Upvote, Downvote, Reply, Edit]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit]
        - buttons: [Upvote, Downvote, Reply, Sticky, Edit]
          children:
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit]
          - buttons: [Upvote, Downvote, Reply, Edit]
            children:
            - buttons: [Upvote, Downvote, Reply, Edit]
              children:
              - buttons: [Upvote, Downvote, Reply, Edit]
                children:
                - buttons: [Upvote, Downvote, Reply, Edit]
        `;
    const commentsRootNoEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Delete]
            - buttons: [Upvote, Downvote, Reply, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Delete]
        - buttons: [Upvote, Downvote, Reply, Sticky, Delete]
          children:
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Delete]
          - buttons: [Upvote, Downvote, Reply, Delete]
            children:
            - buttons: [Upvote, Downvote, Reply, Delete]
              children:
              - buttons: [Upvote, Downvote, Reply, Delete]
                children:
                - buttons: [Upvote, Downvote, Reply, Delete]
        `;
    const commentsRootNoDelEdit =
        // language=yaml
        `
        - buttons: [Upvote, Downvote, Reply, Sticky]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        - buttons: [Upvote, Downvote, Reply, Sticky]
          children:
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
          - buttons: [Upvote, Downvote, Reply]
            children:
            - buttons: [Upvote, Downvote, Reply]
              children:
              - buttons: [Upvote, Downvote, Reply]
                children:
                - buttons: [Upvote, Downvote, Reply]
        `;
        const commentsNoVoting =
            // language=yaml
            `
            - score: null
              children:
              - score: null
                children:
                - score: null
                  children:
                  - score: null
                  - score: null
                    children:
                    - score: null
                - score: null
                  children:
                  - score: null
                    children:
                    - score: null
            - score: null
              children:
              - score: null
                children:
                - score: null
              - score: null
                children:
                - score: null
                  children:
                  - score: null
                    children:
                    - score: null
            `;

    //------------------------------------------------------------------------------------------------------------------

    context('toolbar', () => {

        const isOff = (b: boolean, s: string) => b ? '' : `, ${s} off`;

        const users = [
            {name: 'superuser',   user: USERS.root},
            {name: 'owner',       user: USERS.ace},
            {name: 'moderator',   user: USERS.king},
            {name: 'commenter',   user: USERS.commenterTwo},
            {name: 'read-only',   user: USERS.commenterThree},
            {name: 'non-domain',  user: USERS.commenterOne},
            {name: 'anonymous',   user: USERS.anonymous},
        ];
        const tests = [
            // Superuser
            {user: USERS.root,           comments: commentsRoot,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.root,           comments: commentsRoot,             delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.root,           comments: commentsRootNoDel,        delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.root,           comments: commentsRootNoDel,        delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.root,           comments: commentsRoot,             delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.root,           comments: commentsRootNoEdit,       delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.root,           comments: commentsRootNoEdit,       delOwn: true,  delMod: true,  editOwn: false, editMod: false},
            {user: USERS.root,           comments: commentsRoot,             delOwn: false, delMod: true,  editOwn: false, editMod: true},
            {user: USERS.root,           comments: commentsRootNoDelEdit,    delOwn: true,  delMod: false, editOwn: true,  editMod: false},
            {user: USERS.root,           comments: commentsRootNoDelEdit,    delOwn: false, delMod: false, editOwn: false, editMod: false},
            // Owner
            {user: USERS.ace,            comments: commentsRoot,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.ace,            comments: commentsRoot,             delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.ace,            comments: commentsAceNoModDel,      delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.ace,            comments: commentsRootNoDel,        delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.ace,            comments: commentsRoot,             delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.ace,            comments: commentsAceNoModEdit,     delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.ace,            comments: commentsRootNoEdit,       delOwn: true,  delMod: true,  editOwn: false, editMod: false},
            {user: USERS.ace,            comments: commentsRoot,             delOwn: false, delMod: true,  editOwn: false, editMod: true},
            {user: USERS.ace,            comments: commentsAceNoModDelEdit,  delOwn: true,  delMod: false, editOwn: true,  editMod: false},
            {user: USERS.ace,            comments: commentsRootNoDelEdit,    delOwn: false, delMod: false, editOwn: false, editMod: false},
            // Moderator
            {user: USERS.king,           comments: commentsRoot,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.king,           comments: commentsRoot,             delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.king,           comments: commentsKingNoModDel,     delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.king,           comments: commentsRootNoDel,        delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.king,           comments: commentsRoot,             delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.king,           comments: commentsKingNoModEdit,    delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.king,           comments: commentsRootNoEdit,       delOwn: true,  delMod: true,  editOwn: false, editMod: false},
            {user: USERS.king,           comments: commentsRoot,             delOwn: false, delMod: true,  editOwn: false, editMod: true},
            {user: USERS.king,           comments: commentsKingNoModDelEdit, delOwn: true,  delMod: false, editOwn: true,  editMod: false},
            {user: USERS.king,           comments: commentsRootNoDelEdit,    delOwn: false, delMod: false, editOwn: false, editMod: false},
            // Commenter
            {user: USERS.commenterTwo,   comments: commentsComm,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.commenterTwo,   comments: commentsCommNoDel,        delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.commenterTwo,   comments: commentsComm,             delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.commenterTwo,   comments: commentsCommNoDel,        delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.commenterTwo,   comments: commentsCommNoEdit,       delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.commenterTwo,   comments: commentsComm,             delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.commenterTwo,   comments: commentsCommNoEdit,       delOwn: true,  delMod: true,  editOwn: false, editMod: false},
            {user: USERS.commenterTwo,   comments: commentsAnon,             delOwn: false, delMod: true,  editOwn: false, editMod: true},
            {user: USERS.commenterTwo,   comments: commentsComm,             delOwn: true,  delMod: false, editOwn: true,  editMod: false},
            {user: USERS.commenterTwo,   comments: commentsAnon,             delOwn: false, delMod: false, editOwn: false, editMod: false},
            // Read-only
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.commenterThree, comments: commentsAnon,             delOwn: false, delMod: false, editOwn: false, editMod: false},
            // Non-domain
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.commenterOne,   comments: commentsAnon,             delOwn: false, delMod: false, editOwn: false, editMod: false},
            // Anonymous
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: false, delMod: true,  editOwn: true,  editMod: true},
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: true,  delMod: false, editOwn: true,  editMod: true},
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: false, delMod: false, editOwn: true,  editMod: true},
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: false, editMod: true},
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: true,  delMod: true,  editOwn: true,  editMod: false},
            {user: USERS.anonymous,      comments: commentsAnon,             delOwn: false, delMod: false, editOwn: false, editMod: false},
        ];

        // Iterate users
        users.forEach(userTest =>
            context(`for ${userTest.name} user`, () => {

                before(cy.backendReset);

                const goHome = () =>
                    userTest.user.isAnonymous ?
                        // Go directly to the page if the user is anonymous
                        cy.testSiteVisit(TEST_PATHS.home) :
                        // Login via API otherwise
                        cy.testSiteLoginViaApi(userTest.user, TEST_PATHS.home);

                // Only grab tests for the current user
                tests.filter(t => t.user.id === userTest.user.id)
                    .forEach(test =>
                        it(
                            'shows correct buttons' +
                                isOff(test.delOwn,  'own deletion') +
                                isOff(test.delMod,  'moderator deletion') +
                                isOff(test.editOwn, 'own editing') +
                                isOff(test.editMod, 'moderator editing'),
                            () => {
                                // Update the domain config as needed
                                cy.backendUpdateDomainConfig(
                                    DOMAINS.localhost.id,
                                    {
                                        [DomainConfigKey.commentDeletionAuthor]:    test.delOwn,
                                        [DomainConfigKey.commentDeletionModerator]: test.delMod,
                                        [DomainConfigKey.commentEditingAuthor]:     test.editOwn,
                                        [DomainConfigKey.commentEditingModerator]:  test.editMod,
                                    });

                                // Open Home test page
                                goHome();

                                // Verify comments
                                cy.commentTree('buttons').should('yamlMatch', test.comments);
                            }));

                it('hides scores when voting is disabled', () => {
                    // Disable voting and check the homepage
                    cy.backendReset();
                    cy.backendUpdateDomainConfig(DOMAINS.localhost.id, {[DomainConfigKey.enableCommentVoting]: false});
                    goHome();
                    cy.commentTree('score').should('yamlMatch', commentsNoVoting);
                });
            }));

        context('comment voting', () => {

            beforeEach(cy.backendReset);

            [
                {name: 'superuser',   user: USERS.root},
                {name: 'owner',       user: USERS.ace},
                {name: 'moderator',   user: USERS.king},
                {name: 'commenter',   user: USERS.commenterTwo},
                {name: 'read-only',   user: USERS.commenterThree},
                {name: 'non-domain',  user: USERS.commenterOne},
            ]
                .forEach(test =>
                    it(`allows ${test.name} user to vote`, () => {
                        cy.testSiteLoginViaApi(test.user, TEST_PATHS.comments);
                        cy.commentTree('score').should('yamlMatch', '- score: 0');

                        // Downvote the comment
                        EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', true);
                        cy.commentTree('score').should('yamlMatch', '- score: -1');

                        // Downvote the comment again, the vote cancels itself out
                        EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', true);
                        cy.commentTree('score').should('yamlMatch', '- score: 0');

                        // Upvote, then downvote the comment
                        EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', false);
                        EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', true);
                        cy.commentTree('score').should('yamlMatch', '- score: -1');

                        // Downvote the comment again, the vote cancels itself out
                        EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', true);
                        cy.commentTree('score').should('yamlMatch', '- score: 0');
                    }));

            it('allows anonymous user to vote after login', () => {
                cy.testSiteVisit(TEST_PATHS.comments);
                cy.commentTree('score').should('yamlMatch', '- score: 0');

                // Downvote the comment and get a login dialog
                EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', true);

                // Log in and expect a downvoted comment
                cy.testSiteLogin(USERS.commenterOne, {clickSignIn: false});
                cy.commentTree('score').should('yamlMatch', '- score: -1');

                // Upvote the comment
                EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', false);
                cy.commentTree('score').should('yamlMatch', '- score: 1');

                // Upvote the comment again, the vote cancels itself out
                EmbedUtils.commentVote('0b5e258b-ecc6-4a9c-9f31-f775d88a258b', false);
                cy.commentTree('score').should('yamlMatch', '- score: 0');
            });
        });
    });
});
