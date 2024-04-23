# Bray

**Bray** is a programmable static document processing framework that can output XML, XHTML, HTML, SVG, and PDF (via [Auspex](https://github.com/jupdike/auspex)). (Named in honor of one of the authors of the XML spec, Timothy Bray.)

Bray is a simple, Turing-complete, JavaScript-based static document generation framework based on the idea that *your publication is a program*. (Cf. [Pollen](https://docs.racket-lang.org/pollen/).) Your XML is a tree, not strings, and it is code, ES6 code. When all of your code is collected together and executed (rendered) the result is just a tree or an XML (SVG, HTML, [Auspex](https://github.com/jupdike/auspex)) string.

## JSX

* https://facebook.github.io/jsx/
* https://reactjs.org/docs/introducing-jsx.html
* https://reactjs.org/docs/jsx-in-depth.html

Bray is built on JSX, which means you can paste in HTML and SVG (or any clean subset of XML tags plus text strings) and get back the same XML (or HTML and SVG). But you can also extend these (or your own domain-specific document XML language) in a programmatic manner to do anything you want in code. It is just declarative code and content mixed together.

## Why does Bray exist?

Bray itself knows nothing about the output XML tags (SVG, HTML, [Auspex](https://github.com/jupdike/auspex)), and in fact, does not need to! Bray just knows that these atomic or built-in tags start with a lowercase letter, and that your components are just uppercase functions from properties to a BrayElem (document tree). There may be libraries that work with Bray to accomplish certain domain-specific goals ([Auspex](https://github.com/jupdike/auspex) for PDF, or SVG-to-PDF), but that is just a matter of which later components get used and which code gets called. No magic!

Bray just collects the bits up, and automates the boilerplate parts. Because it does not know anything about your domain, it can be employed across very different projects, depending on your needs. And since Bray just uses JSX, syntax highlighting already works in your editor of choice with existing JSX plugins.

## Other features of Bray

### Markdown

Bray supports files with the `.jsx.md` extension. [CommonMark.js](https://github.com/commonmark/commonmark.js) parses the Markdown (with smart-quotes == true by default) and converts it to HTML. Any component tags (capitalized) get passed through as-is (e.g. `<MyComponent>Wrapped text</MyComponent>`), so they must be defined in other files, as `my-component.jsx`, etc. or an error will be thrown. Then the HTML + your component tags are treated as any Bray `.jsx` file would be, and processed by Babelscript to make JavaScript that is then executed when you reference your `.jsx.md` components from `main.jsx` or down the line, then the XML tree is rendered, then you get it back out with the components expanded out.

### Easy to see and type Page Breaks

Another feature is page breaks: empty lines with six hyphens are not interpreted as horizontal rule (thematic break) but as `<PageBreak/>` which you must define as a component somewhere yourself.

### Special inline auto-numbering footnotes

TODO (hence caret instead of manual numbers): `[^](https://example.com/ "Text of note")` which will turn into `<FootNote href="xyz">Text of note</FootNote>`. You can then collect up your footnotes as desired (and auto-number them, for example), and then make your own `<FootNotes/>` so your list of notes can be spit out automatically ... ? TODO

This combination of these small extensions, plus Bray's Turing-complete approach, plus Markdown's intuitiveness (and lack of indentation) makes for a really robust, powerful, and easy-to-use document generation system.
