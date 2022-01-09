class BrayElem {
  constructor(type, props, ...children) {
    this.type = type;
    this.props = props || {};
    this.props.children = children;
  }
  static create(type, props, ...children) {
    return new BrayElem(type, props, ...children);
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
  _smartBuilderPush(builder, indentBox, item) {
    if (item.startsWith('</') || item.endsWith('/>')) {
      indentBox.indent--;
    }
    //console.log('sBI:', indentBox.indent, item);
    let lastClosed = builder.length > 0 && builder[builder.length - 1].endsWith(">");
    if (lastClosed && item.startsWith('<')) {
      builder.push('\n');
      for (let i = 0; i < indentBox.indent; i++) {
        builder.push('  ');
      }
    }
    if (item.startsWith('<') && !item.startsWith('</') && !item.endsWith('/>')) {
      indentBox.indent++;
    }
    //console.log('sBI:', indentBox.indent);
    builder.push(item);
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
      attrBuilder.push(` ${k}="${escaped(rhs)}"`);
    }
    let attrString = attrBuilder.join('');
    if (this.props.children.length < 1) {
      this._smartBuilderPush(builder, indentBox, `<${this.type}${attrString}/>\n`);
    }
    else {
      if (this.type === BrayElem.Fragment) {
        this._renderChildrenToString(builder, indentBox, this.props.children);
      }
      else {
        this._smartBuilderPush(builder, indentBox, `<${this.type}${attrString}>`);
        this._renderChildrenToString(builder, indentBox, this.props.children);
        this._smartBuilderPush(builder, indentBox, `</${this.type}>`);
      }
    }
  }
  _renderChildrenToString(builder, indentBox, children) {
    children.forEach(kid => {
      if (BrayElem.isString(kid)) {
        this._smartBuilderPush(builder, indentBox, kid);
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
}