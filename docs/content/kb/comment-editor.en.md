---
title: Comment Editor
description: How to write comments using the Comment Editor
tags:
    - comment
    - comment editor
    - editor
    - keyboard shortcuts
seeAlso:
    - comment
    - comment-tree
    - markdown
---

The **Comment Editor** allows to create and update [comments](comment) in a [comment tree](comment-tree) using the [Markdown](markdown) syntax.

<!--more-->

## Markdown

Comments are written in Markdown, which makes them look like regular plain text, and at the same time allows for more sophisticated formatting. For example, you can add links, images, even tables — find out more on the [](markdown) page.

Here's one example of a comment on Markdown:

{{< alert "secondary" >}}
You can write in **bold** or *italic*, insert [links](https://comentario.app) and make lists:
 
* Apples
* Oranges
* Pears
{{< /alert >}}

And below is its "source" text:

```md
You can write in **bold** or *italic*, insert [links](https://comentario.app) and make lists:

* Apples
* Oranges
* Pears
```

## Keyboard shortcuts

You can quickly close the editor, modify selected text, or insert new Markdown by using the following keyboard shortcuts:

<div class="table-responsive">

| Shortcut (Windows, Linux)                   | Shortcut (Mac OS)                        | Description                                                                                            |
|---------------------------------------------|------------------------------------------|--------------------------------------------------------------------------------------------------------|
| <kbd>Ctrl</kbd><kbd>Enter</kbd>             | <kbd>⌘</kbd><kbd>Enter</kbd>             | Submit changes and close the editor                                                                    | 
| <kbd>Escape</kbd>                           | <kbd>Escape</kbd>                        | Discard changes and close the editor                                                                   | 
| <kbd>Ctrl</kbd><kbd>B</kbd>                 | <kbd>⌘</kbd><kbd>B</kbd>                 | Make selected text **bold**                                                                            | 
| <kbd>Ctrl</kbd><kbd>I</kbd>                 | <kbd>⌘</kbd><kbd>I</kbd>                 | Make selected text *italic*                                                                            | 
| <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>X</kbd> | <kbd>⌘</kbd><kbd>Shift</kbd><kbd>X</kbd> | Make selected text ~~strikethrough~~                                                                   | 
| <kbd>Ctrl</kbd><kbd>K</kbd>                 | <kbd>⌘</kbd><kbd>K</kbd>                 | Insert a link (when [enabled](/configuration/backend/dynamic/domain.defaults.markdown.links.enabled/)) | 
| <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>.</kbd> | <kbd>⌘</kbd><kbd>Shift</kbd><kbd>.</kbd> | Insert a blockquote                                                                                    | 
| <kbd>Ctrl</kbd><kbd>E</kbd>                 | <kbd>⌘</kbd><kbd>E</kbd>                 | Insert a code block                                                                                    | 
| <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>8</kbd> | <kbd>⌘</kbd><kbd>Shift</kbd><kbd>8</kbd> | Insert a bullet list                                                                                   | 
| <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>7</kbd> | <kbd>⌘</kbd><kbd>Shift</kbd><kbd>7</kbd> | Insert a numbered list                                                                                 | 
{.table .table-striped}
</div>
