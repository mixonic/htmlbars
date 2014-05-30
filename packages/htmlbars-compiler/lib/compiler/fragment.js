import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = 0;
  this.contextualNamespaces = [];
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.source.length = 0;
  this.depth = 0;

  this.source.push('function build(dom) {\n');
  processOpcodes(this, opcodes);
  this.source.push('}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.contextualNamespace = function() {
  var length = this.contextualNamespaces.length;
  if (length > 0) {
    return this.contextualNamespaces[length-1];
  } else {
    return null;
  }
};

FragmentCompiler.prototype.empty = function() {
  this.source.push('  return dom.createDocumentFragment();\n');
};

FragmentCompiler.prototype.startFragment = function() {
  this.source.push('  var el0 = dom.createDocumentFragment();\n');
};

FragmentCompiler.prototype.endFragment = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.openRootElement = function(tagName) {
  var functionCall,
      namespace = this.contextualNamespace();

  if (namespace) {
    functionCall = 'createElementNS('+string(namespace)+', ';
  } else {
    functionCall = 'createElement(';
  }

  this.source.push('  var el0 = dom.'+functionCall+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.closeRootElement = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.rootText = function(str) {
  this.source.push('  return dom.createTextNode('+string(str)+');\n');
};

FragmentCompiler.prototype.openNamespace = function(namespace) {
  this.contextualNamespaces.push(namespace);
};

FragmentCompiler.prototype.closeNamespace = function(namespace) {
  this.contextualNamespaces.pop();
};

FragmentCompiler.prototype.openElement = function(tagName) {
  var functionCall,
      el = 'el'+(++this.depth),
      namespace = this.contextualNamespace();

  if (namespace) {
    functionCall = 'createElementNS('+string(namespace)+', ';
  } else {
    functionCall = 'createElement(';
  }

  this.source.push('  var '+el+' = dom.'+functionCall+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push('  dom.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.text = function(str) {
  var el = 'el'+this.depth;
  this.source.push('  dom.appendText('+el+','+string(str)+');\n');
};

FragmentCompiler.prototype.closeElement = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push('  dom.appendChild('+el+', '+child+');\n');
};
