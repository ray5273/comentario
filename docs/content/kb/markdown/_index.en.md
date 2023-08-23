---
title: Markdown
description: Markdown format used in Comentario comments
tags:
    - Markdown
---

Comentario allows to write comments with rich formatting by using the so-called **Markdown format** (or language).

<!--more-->

Markdown is a lightweight markup language that allows you to format plain text in a simple and easy-to-read way. It is widely used for writing documentation, creating README files, and even writing blog posts. Markdown files typically have a `.md` extension.

Markdown provides a set of syntax rules that you can use to format your text. Below are some basic examples of Markdown formatting.

## Headings

```md
# Heading 1
## Heading 2
### Heading 3
```

Result:

{{< alert "secondary" >}}
# Heading 1
## Heading 2
### Heading 3
{{< /alert >}}


## Emphasis

```md
*Italic text*
**Bold text**
```

Result:

{{< alert "secondary" >}}
*Italic text*\
**Bold text**
{{< /alert >}}


## Strikethrough

```md
~~I really mean that~~
```

Result:

{{< alert "secondary" >}}
~~I really mean that~~
{{< /alert >}}


## Lists

```md
* First item
* Second item
* Third item
```

Result:

{{< alert "secondary" >}}
* First item
* Second item
* Third item
{{< /alert >}}

```md
1. First item
2. Second item
3. Third item
```

Result:

{{< alert "secondary" >}}
1. First item
2. Second item
3. Third item
{{< /alert >}}

## Links


```md
[Link text](https://www.example.com)
```

Result:

{{< alert "secondary" >}}
[Link text](https://www.example.com)
{{< /alert >}}


## Images

```md
![Alt text](path/to/image.png)
```

Result:

{{< alert "secondary" >}}
![Alt text](/img/docs-logo.png)
{{< /alert >}}


## Code blocks

    ```python
    def hello_world():
        print("Hello, World!")
    ```

Result:

{{< alert "secondary" >}}
```python
def hello_world():
    print("Hello, World!")
```
{{< /alert >}}


## Blockquotes

```md
> This is a blockquote.
```

Result:

{{< alert "secondary" >}}
> This is a blockquote.
{{< /alert >}}


## Tables

```md
| Column 1 | Column 2 |
|----------|----------|
| Cell A   | Cell B   |
```

Result:

{{< alert "secondary" >}}
| Column 1 | Column 2 |
|----------|----------|
| Cell A   | Cell B   |
{{< /alert >}}

These are just a few examples of Markdown syntax. Markdown is highly versatile and supports many other formatting options. It's a great way to write and format text without the need for complex HTML or other markup languages.
