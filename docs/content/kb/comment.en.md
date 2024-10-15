---
title: Comment
description: What is a comment
tags:
    - comment
    - comment tree
seeAlso:
    - markdown
    - domain
    - domain-page
    - comment-tree
    - comment-editor
---

A **comment** is, just like [domain](domain), a basic building block in Comentario. A comment represents a piece of text, multiple comments are arranged in a tree structure called [comment tree](comment-tree).

<!--more-->

A comment has the following attributes:

* **Author**, a reference to the user who created the comment;
* **Unique ID** in the UUID form, e.g. `7a418d0c-603e-4708-a098-19c3606c0a8b;
* A reference to the **parent** comment, if it's a reply;
* **Text** in [Markdown](markdown) format;
* **Score**, a number that is changed by other users by voting on the comment;
* **Sticky flag**, causing the comment to always appear at the top of page. Only applies to root comments;
* **Pending flag**, meaning the comment is pending moderator approval;
* **Pending reason**, explaining why the comment is pending approval;
* **Approved flag**, indicating whether the comment is rejected or approved by a domain moderator. Only approved comments are shown on the page;
* **Deleted flag**, marking comments that have been deleted by their author or a domain moderator;
* **Creation time**.
