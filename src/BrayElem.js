class XmlHandler {
  constructor(sax, tagMap) {
    const strict = true;
    this.saxParser = sax.parser(strict);
    this.saxParser.onerror = this.onerror;
    this.saxParser.ontext = this.ontext;
    this.saxParser.onopentag = this.onopentag;
    this.saxParser.onclosetag = this.onclosetag;
    this.saxParser.parseStack = [];
    this.saxParser.root = null;
    //this.options = options;
    this.saxParser.tagMap = tagMap;
  }
  onerror(e) {
    throw e;
  }
  ontext(text) {
    if (!this.parseStack) {
      console.warn('Warning: Skipping text before any tags:', text);
      return;
    }
    if (this.parseStack.length === 0) {
      console.warn('Warning: Skipping text after last tag:', text);
      return;
    }
    //console.warn('TEXT:', text);
    const last = this.parseStack[this.parseStack.length - 1];
    last.props.children.push(text);
  }
  onopentag(node) {
    //console.warn('OPEN:', node.name, node.attributes);
    //console.warn('THIS: ---\n', this);
    let type = node.name;
    if (this.tagMap) {
      if (this.tagMap.hasOwnProperty(type)) {
        type = this.tagMap[type];
      }
    }
    this.parseStack.push(BrayElem.create(type, node.attr || null));
  }
  onclosetag(name) {
    //console.warn(this.parseStack.length, 'CLOSE:', name);
    let item = this.parseStack.pop();
    // this will not work if we are mapping tag strings to function components
    // if (name !== item.type) {
    //   console.warn('Mismatched tag: "'+name+'". Expected "'+item.type+'"');
    // }
    if (this.parseStack.length === 0) {
      this.root = item;
    } else {
      const last = this.parseStack[this.parseStack.length - 1];
      last.props.children.push(item);
    }
    //console.warn(this.parseStack.length, 'ITEM:', item);
  }
  parseXmlString(xmlString) {
    this.saxParser.write(xmlString).close();
    return this.saxParser.root;
  }
}

export default class BrayElem {
  constructor(type, props, ...children) {
    this.type = type;
    this.props = props || {};
    this.props.children = children;
  }
  static create(type, props, ...children) {
    return new BrayElem(type, props, ...children);
  }
  static mergeObjects(old, nu) {
    let ret = {};
    for (var k in old) {
      if (!old.hasOwnProperty(k)) {
        continue;
      }
      ret[k] = old[k];
    }
    for (var k in nu) {
      if (!nu.hasOwnProperty(k)) {
        continue;
      }
      ret[k] = nu[k];
    }
    // console.warn('---');
    // console.warn(old);
    // console.warn(ret);
    return ret;
  }
  duplicateWithField(fieldKey, value) {
    let nu = {};
    nu[fieldKey] = value;
    let props = BrayElem.mergeObjects(this.props, nu); // includes children
    let ret = BrayElem.create(this.type, props, ...props.children);
    // console.warn('-=-=-');
    // console.warn(this);
    // console.warn(ret);
    return ret;
  }
  static isString(x) {
    return typeof x === "string" || x instanceof String;
  }
  static isArray(x) {
    return Array.isArray(x);
  }
  static get Fragment() {
    return "__BRAY_ELEM_FRAGMENT";
  }
  static get MAX_COMPONENT_DEPTH() {
    return 10000;
  }
  // Components are computed lazily, so reduce them to get to a final "atomic" (string) type
  _reduceHead() {
    let ret = this;
    let count = 0;
    while (!BrayElem.isString(ret.type)) {
      ret = ret.type(ret.props);
      // detect inadvertent infinite loops
      count++;
      if (count > BrayElem.MAX_COMPONENT_DEPTH) {
        throw "BrayElem.render -- max component depth exceeded: " + BrayElem.MAX_COMPONENT_DEPTH;
      }
    }
    //console.log('_reduceHead ret:', ret);
    return ret;
  }
  renderToString() {
    let builder = [];
    let indentBox = { indent: 0 };
    if (BrayElem.isString(this.type)) {
      this._renderToStringInner(indentBox, builder);
    }
    else {
      this._reduceHead()._renderToStringInner(indentBox, builder);
    }
    let ret = builder.join('');
    return ret;
  }
  static _smartBuilderPush(builder, indentBox, item) {
    //console.log('sBI:', indentBox.indent, '|||'+item+'|||');
    if (item.startsWith('</')) {
      indentBox.indent--;
    }
    //console.log('sBI:', indentBox.indent);
    let lastClosed = builder.length > 0 && builder[builder.length - 1].endsWith(">");
    if (lastClosed && item.startsWith('<')) {
      //console.log('sBI -- newline and indent');
      builder.push('\n');
      for (let i = 0; i < indentBox.indent; i++) {
        builder.push('  ');
      }
    }
    //console.log('sBI:', indentBox.indent);
    if (item.startsWith('<') && !item.startsWith('</') && !item.endsWith('/>')) {
      indentBox.indent++;
    }
    //console.log('sBI:', indentBox.indent);
    builder.push(item);
  }
  static escapedString(x) {
    // TODO escape quotes and backslashes
    return x;
  }
  // Don't call this directly from outside renderToString, please
  // cf. https://stackoverflow.com/questions/22156326/private-properties-in-javascript-es6-classes
  _renderToStringInner(indentBox, builder) {
    if (!BrayElem.isString(this.type)) {
      throw 'BrayElem.renderInner -- expected string element type; this should not happen ...';
    }
    let attrBuilder = [];
    for (let k in this.props) {
      if (!this.props.hasOwnProperty(k) || k === 'children') {
        continue;
      }
      let rhs = this.props[k] + ''; // make this a string
      attrBuilder.push(` ${k}="${BrayElem.escapedString(rhs)}"`);
    }
    let attrString = attrBuilder.join('');
    if (this.props.children.length < 1) {
      BrayElem._smartBuilderPush(builder, indentBox, `<${this.type}${attrString}/>`);
    }
    else {
      if (this.type === BrayElem.Fragment) {
        this._renderChildrenToString(builder, indentBox, this.props.children);
      }
      else {
        BrayElem._smartBuilderPush(builder, indentBox, `<${this.type}${attrString}>`);
        this._renderChildrenToString(builder, indentBox, this.props.children);
        BrayElem._smartBuilderPush(builder, indentBox, `</${this.type}>`);
      }
    }
  }
  _renderChildrenToString(builder, indentBox, children) {
    children.forEach(kid => {
      if (BrayElem.isString(kid)) {
        BrayElem._smartBuilderPush(builder, indentBox, kid);
      }
      // an array is from fragments?
      else if (BrayElem.isArray(kid)) {
        this._renderChildrenToString(builder, indentBox, kid);
      }
      else {
        kid._reduceHead()._renderToStringInner(indentBox, builder);
      }
    });
  }
  // 'sax' here is the sax-js namespace (sax.parser will be created for us by XmlHandler)
  // retrieved 4 Feb 2022 -- last change 5aee216 on Jun 22, 2017
  // https://github.com/isaacs/sax-js
  // https://raw.githubusercontent.com/isaacs/sax-js/master/lib/sax.js
  // https://github.com/isaacs/sax-js/blob/master/lib/sax.js
  //
  // 'xmlString' is the XML document as a single string (one XML element, sans DOCTYPE, sans ?xml)
  //
  // 'tagMap' is an optional object with keys (strings) mapping tag names to either strings or
  // function components. Tag name strings with no matching key in 'tagMap' will be left as is.
  // Function components here mean functions that take a single argument, props (with props.children),
  // and return a BrayElem. The result of these optional function components (BrayElem(s)) can then be
  // rendered back to an XML string via BrayElem.renderToString()
  static fromXmlString(sax, xmlString, tagMap) {
    tagMap = tagMap || {};
    const handler = new XmlHandler(sax, tagMap);
    // parse xmlString and create a giant tree of BrayElems
    return handler.parseXmlString(xmlString);
  }
}
