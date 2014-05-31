import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = 0;
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.source.length = 0;
  this.depth = 0;
  this.domDepth = 0;

  this.source.push('function build(dom0) {\n');
  processOpcodes(this, opcodes);
  this.source.push('}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.empty = function() {
  this.source.push('  return dom'+this.domDepth+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.startFragment = function() {
  this.source.push('  var el0 = dom'+this.domDepth+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.endFragment = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.openRootElement = function(tagName) {
  var functionCall;

  if (namespace) {
    functionCall = 'createElementNS('+string(namespace)+', ';
  } else {
    functionCall = 'createElement(';
  }

  this.source.push('  var el0 = dom'+this.domDepth+'.'+functionCall+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.closeRootElement = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.rootText = function(str) {
  this.source.push('  return dom'+this.domDepth+'.createTextNode('+string(str)+');\n');
};

FragmentCompiler.prototype.openNamespace = function(namespace) {
  var previous = 'dom'+this.domDepth,
           dom = 'dom'+(++this.domDepth);
  this.source.push('  var '+dom+' = new '+previous+'.constructor('+previous+'.document, '+string(namespace)+');\n');
};

FragmentCompiler.prototype.openHTMLIntegrationPoint = function() {
  var previous = 'dom'+this.domDepth,
           dom = 'dom'+(++this.domDepth);
  this.source.push('  var '+dom+' = new '+previous+'.constructor('+previous+'.document);\n');
};

// Closes both namespaces and HTML integration points
FragmentCompiler.prototype.closeNamespace = function() {
  --this.domDepth;
};

FragmentCompiler.prototype.openElement = function(tagName) {
  var functionCall,
      el = 'el'+(++this.depth);

  if (namespace) {
    functionCall = 'createElementNS('+string(namespace)+', ';
  } else {
    functionCall = 'createElement(';
  }

  this.source.push('  var '+el+' = dom'+this.domDepth+'.'+functionCall+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push('  dom'+this.domDepth+'.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.text = function(str) {
  var el = 'el'+this.depth;
  this.source.push('  dom'+this.domDepth+'.appendText('+el+','+string(str)+');\n');
};

FragmentCompiler.prototype.closeElement = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push('  dom'+this.domDepth+'.appendChild('+el+', '+child+');\n');
};
