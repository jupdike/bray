# Bray

**Bray** is a programmable static document processing framework that can output XML, XHTML, HTML, SVG. See README.md for how Markdown (`.jsx.md`) files are handled.

The Bray command-line runs in a `src/` project folder structured as follows:

* `src/components/`: `.jsx` or `.jsx.md` files that can be invoked elsewhere (see render below). The code from these files is not written out anywhere unless invoked. They can be invoked zero or more times.
* `src/render/`: `.jsx` or `.jsx.md` files whose code is executed to produce an HTML string, which is written to disk. In developer mode, the file is not written to disk, but the string is computed and the data is sent to the connected client instead of written.
* `src/static/`: static file assets (.png, .css, .svg, .js, etc.) served up as-is by the web server, or copied directly to the output folder; the folder structure is maintained.

A parallel `build/` folder, at the level of `src/`, will be created, for static output.

The core of Bray is implemented by BrayElem and index.js. When invoked on the command-line (or run in developer mode), Bray reads text files with `.jsx` or `.jsx.md` extension and converts everything to valid JSX code (adding `const ComponentNameBasedOnHyphenatedFileName = (props) => <xyz>contents of file here</xyz>` when the file does not begin with a less-than symbol) or converting Markdown to JSX first if necessary, etc.

Specifially, the JSX extensions implemented by Bablescript allow us to define how the capitalized components are turned into JavaScript: instead of the default `React.createElement` and `React.creatFragment` being called (the latter for `<>...</>` syntax, allowing multiple element return), rather our own static `BrayElem.create` and `BrayElem.Fragment` constructors are called.

All of the components are converted from JSX to JavaScript using Bablescript, then that prelude of component code is kept around as a string. Then each render target (for static output mode) is converted to JavaScript, prelude prepended, and all this JavaScript code is executed to get a tree which is rendered by calling `BrayElem.renderToString()`, or for development mode, the requested render target (ending in `.html`, if the filename matches) is returned by the server to the client.

The goal is to allow very clean code and content to be created in a scalable fashion by the user of Bray, who focuses entirely on writing what they want to write, creating modular components where it makes sense, and sprinkling the minimum extra JavaScript in to do more tricky sorts of things, before the static output is created. The result is a powerful mostly-declarative document generation system that mostly gets out of the way, and can be used in the most flexible ways possible, with consistency of a readable source tree—made of easily-written text formats—being key.
