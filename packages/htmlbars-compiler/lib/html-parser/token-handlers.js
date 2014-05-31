import { ProgramNode, ComponentNode, ElementNode, TextNode, appendChild } from "htmlbars-compiler/ast";
import { postprocessProgram } from "htmlbars-compiler/html-parser/helpers";

// This table maps from the state names in the tokenizer to a smaller
// number of states that control how mustaches are handled
var states = {
  "beforeAttributeValue": "before-attr",
  "attributeValueDoubleQuoted": "attr",
  "attributeValueSingleQuoted": "attr",
  "attributeValueUnquoted": "attr",
  "beforeAttributeName": "in-tag"
};

var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr circle rect stop";
var voidMap = {};

var svgNamespace = "http://www.w3.org/2000/svg";

voidTagNames.split(" ").forEach(function(tagName) {
  voidMap[tagName] = true;
});

// Except for `mustache`, all tokens are only allowed outside of
// a start or end tag.
var tokenHandlers = {

  Chars: function(token) {
    var current = this.currentElement();
    var text = new TextNode(token.chars);
    appendChild(current, text);
  },

  StartTag: function(tag) {
    var element = new ElementNode(tag.tagName, tag.attributes, tag.helpers || [], []);
    var currentElement = this.currentElement();
    // SVG is a namespace. Maybe MathML is another?
    if (tag.tagName === 'svg') {
      element.namespace = svgNamespace;
    // There are additional tags for HTML besides foreignObject.
    // see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tree-construction.html
    } else if (tag.tagName === 'foreignObject') {
      element.isHTMLIntegrationPoint = true;
    } else {
      if (currentElement.type === 'element' && !currentElement.isHTMLIntegrationPoint) {
        element.namespace = currentElement.namespace;
      }
    }
    this.elementStack.push(element);
    if (voidMap.hasOwnProperty(tag.tagName)) {
      tokenHandlers.EndTag.call(this, tag);
    }
  },

  block: function(block) {
    if (this.tokenizer.state !== 'data') {
      throw new Error("A block may only be used inside an HTML element or another block.");
    }
  },

  mustache: function(mustache) {
    var state = this.tokenizer.state;
    var token = this.tokenizer.token;

    switch(states[state]) {
      case "before-attr":
        this.tokenizer.state = 'attributeValueUnquoted';
        token.addToAttributeValue(mustache);
        return;
      case "attr":
        token.addToAttributeValue(mustache);
        return;
      case "in-tag":
        token.addTagHelper(mustache);
        return;
      default:
        appendChild(this.currentElement(), mustache);
    }
  },

  EndTag: function(tag) {
    var element = this.elementStack.pop();
    var parent = this.currentElement();

    if (element.tag !== tag.tagName) {
      throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + element.tag);
    }

    if (element.tag.indexOf("-") === -1) {
      appendChild(parent, element);
    } else {
      var program = new ProgramNode(element.children, { left: false, right: false });
      postprocessProgram(program);
      var component = new ComponentNode(element.tag, element.attributes, program);
      appendChild(parent, component);
    }

  }

};

export default tokenHandlers;
