import { processOpcodes } from "./utils";
import { string } from "./quoting";

export function FragmentCompiler() {
  this.source = [];
  this.depth = 0;
  this.domHelper = 'dom0';
}

FragmentCompiler.prototype.compile = function(opcodes) {
  this.source.length = 0;
  this.depth = 0;

  this.source.push('function build() {\n');
  processOpcodes(this, opcodes);
  this.source.push('}\n');

  return this.source.join('');
};

FragmentCompiler.prototype.empty = function() {
  this.source.push('  return '+this.domHelper+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.startFragment = function() {
  this.source.push('  var el0 = '+this.domHelper+'.createDocumentFragment();\n');
};

FragmentCompiler.prototype.endFragment = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.openRootElement = function(tagName) {
  this.source.push('  var el0 = '+this.domHelper+'.createElement('+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.closeRootElement = function() {
  this.source.push('  return el0;\n');
};

FragmentCompiler.prototype.rootText = function(str) {
  this.source.push('  return '+this.domHelper+'.createTextNode('+string(str)+');\n');
};

FragmentCompiler.prototype.openElement = function(tagName) {
  var el = 'el'+(++this.depth);
  this.source.push('  var '+el+' = '+this.domHelper+'.createElement('+
    string(tagName)+
  ');\n');
};

FragmentCompiler.prototype.setAttribute = function(name, value) {
  var el = 'el'+this.depth;
  this.source.push('  '+this.domHelper+'.setAttribute('+el+','+string(name)+','+string(value)+');\n');
};

FragmentCompiler.prototype.text = function(str) {
  var el = 'el'+this.depth;
  this.source.push('  '+this.domHelper+'.appendText('+el+','+string(str)+');\n');
};

FragmentCompiler.prototype.closeElement = function() {
  var child = 'el'+(this.depth--);
  var el = 'el'+this.depth;
  this.source.push('  '+this.domHelper+'.appendChild('+el+', '+child+');\n');
};
