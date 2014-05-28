import {domHelpers} from "htmlbars-runtime/dom-helpers";
import {equalHTML} from "test/support/assertions";

var dom,
    xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace   = "http://www.w3.org/2000/svg";

module('htmlbars-runtime: DOM Helpers',{
  setup: function(){
    dom = domHelpers();
  }
});

test('#createElement', function(){
  var node = dom.createElement('div');
  equal(node.tagName, 'DIV');
  equal(node.namespaceURI, xhtmlNamespace);
  equalHTML(node, '<div></div>');
});

test('#createElementNS with foreign namespace', function(){
  var node = dom.createElementNS(svgNamespace, 'svg');
  equal(node.tagName, 'svg');
  equal(node.namespaceURI, svgNamespace);
  equalHTML(node, '<svg></svg>');
});

test('#appendText adds text', function(){
  var node = dom.createElement('div');
  dom.appendText(node, 'Howdy');
  equalHTML(node, '<div>Howdy</div>');
});

test('#setAttribute', function(){
  var node = dom.createElement('div');
  dom.setAttribute(node, 'id', 'super-tag');
  equalHTML(node, '<div id="super-tag"></div>');
});
