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
    let type = node.name;
    const oldTagName = type;
    if (this.tagMap) {
      if (this.tagMap.hasOwnProperty(type)) {
        type = this.tagMap[type];
      }
    }
    let attrs = node.attributes || {};
    attrs._oldTagName = oldTagName;
    let newNode = BrayElem.create(type, attrs);
    this.parseStack.push(newNode);
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
  // merge all k:v pairs in old and nu into brand new object (nu supersedes old)
  // either can be null or undefined
  static mergeObjects(old, nu) {
    let ret = {};
    if (old) {
      for (var k in old) {
        if (!old.hasOwnProperty(k)) {
          continue;
        }
        ret[k] = old[k];
      }
    }
    if (nu) {
      for (var k in nu) {
        if (!nu.hasOwnProperty(k)) {
          continue;
        }
        ret[k] = nu[k];
      }
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
  static isObject(objValue) {
    return objValue && typeof objValue === 'object' && objValue.constructor === Object;
  }
  static WhitespaceRegex = new RegExp("^[ \n]+$", "g");
  static isWhiteSpaceString(x) {
    if (!BrayElem.isString(x)) {
      return false;
    }
    if (x.match(BrayElem.WhitespaceRegex)) {
      return true;
    }
    return false;
  }
  static get Fragment() {
    return "__BRAY_ELEM_FRAGMENT";
  }
  static get MAX_COMPONENT_DEPTH() {
    return 10000;
  }
  // Components are computed lazily, so reduce them to get to a final "atomic" (string) type
  _reduceHead(moreProps) {
    let ret = this;
    let count = 0;
    while (!BrayElem.isString(ret.type)) {
      ret = ret.type(BrayElem.mergeObjects(ret.props, moreProps));
      // detect inadvertent infinite loops
      count++;
      if (count > BrayElem.MAX_COMPONENT_DEPTH) {
        throw "BrayElem.render -- max component depth exceeded: " + BrayElem.MAX_COMPONENT_DEPTH;
      }
    }
    //console.log('_reduceHead ret:', ret);
    return ret;
  }
  static pushFront(oldArray, item) {
    let arr = oldArray;
    if (!arr) {
      arr = [];
    }
    return [item].concat(arr);
  }
  invokeSelf(moreProps) {
    if (BrayElem.isString(this.type)) {
      return this;
    }
    let props = BrayElem.mergeObjects(this.props, moreProps);
    // invoke the component (assumes it is a function if it is not a string)
    return this.type(props);
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
  static childrenWithoutWhitespaceStrings(children, extraProps) {
    const ret = children.filter(x => !BrayElem.isWhiteSpaceString(x));
    let builder = [];
    ret.forEach(kid => {
      if (BrayElem.isString(kid)) {
        builder.push(kid);
        return;
      }
      kid = kid._reduceHead(extraProps);
      if (!BrayElem.isString(kid.type)) { // node with component for type
        builder.push(kid);
        return;
      }
      if (kid.type === BrayElem.Fragment) { // node with fragment string for type
        let innerKids = BrayElem.childrenWithoutWhitespaceStrings(kid.props.children, extraProps);
        innerKids.forEach(x => {
          builder.push(x);
        });
        return;
      }
      // node with string for type
      builder.push(kid);
    });
    return builder;
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
  // 'xmlString' is the XML document as a single string (one XML element (with children), sans DOCTYPE, sans ?xml)
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
  // fetch a value:
  // 0. if props is actually an array, iterate through and try to find the first matching key (1, 2, 3)
  // 1. search props as an object
  // 2. search props.style if style is already an object
  // 3. search props.style if it is a string like this: "k1: v1; k2: v2"
  // 4. return default (which can be null, so these can be chained)
  static propOrStyleOrDefault(props, key, defaultValue) {
    props = props || {};
    if (props.hasOwnProperty(key)) {
      return props[key];
    }
    if (BrayElem.isArray(props)) {
      let ret = null;
      for (let i = 0; i < props.length; i++) {
        const innerProps = props[i];
        const v = BrayElem.propOrStyleOrDefault(innerProps, key, null);
        if (v) {
          return v;
        }
      }
      return defaultValue;
    }
    if (props.hasOwnProperty('style') && BrayElem.isObject(props.style)) {
      if (props.style.hasOwnProperty(key)) {
        return props.style[key];
      }
    }
    if (props.hasOwnProperty('style') && BrayElem.isString(props.style)) {
      const ps = props.style.split(';');
      for (let i = 0; i < ps.length; i++) {
        const piece = ps[i];
        if (piece.indexOf(':') >= 1) {
          const kv = piece.split(':');
          const k = kv[0].trim();
          if (key === k) {
            const v = kv[1].trim();
            if (v === 'null' || v === 'none') {
              return null;
            }
            return v;
          }
        }
      }
      if (props.style.hasOwnProperty(key)) {
        return props.style[key];
      }
    }
    return defaultValue;
  }
}
