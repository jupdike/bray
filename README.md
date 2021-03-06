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
