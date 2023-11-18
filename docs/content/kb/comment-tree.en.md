---
title: Comment tree
description: Comments are arranged in a tree structure
tags:
    - domain
    - domain page
    - comment
    - comment tree
    - comment thread
seeAlso:
    - comment
    - domain-page
    - /configuration/embedding
---

The term **comment tree**, also called **comment thread**, means that [comments](comment) are organized in a tree structure, so that comments can have children — which we call **replies**.

<!--more-->

For example:

```
root comment A
  +-- child comment A1
  +-- child comment A2

root comment B
  +-- child comment B1
        +-- child comment B11
  +-- child comment B2
        +- child comment B21
        +- child comment B22
        ...
```

Every child comment can, in turn, also have children (replies), and so on.

Every [domain page](domain-page) has an own comment tree.

