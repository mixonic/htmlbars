export function DOMHelper(_document, namespace){
  this.document = _document;
  this.namespace = namespace;
}

var prototype = DOMHelper.prototype;
prototype.constructor = DOMHelper;

prototype.appendChild = function(element, childElement) {
  element.appendChild(childElement);
};

prototype.appendText = function(element, text) {
  element.appendChild(this.document.createTextNode(text));
};

prototype.setAttribute = function(element, name, value) {
  element.setAttribute(name, value);
};

prototype.createElement = function(tagName) {
  if (this.namespace) {
    return this.document.createElementNS(this.namespace, tagName);
  } else {
    return this.document.createElement(tagName);
  }
};

prototype.createDocumentFragment = function(){
  return this.document.createDocumentFragment();
};

prototype.createTextNode = function(text){
  return this.document.createTextNode(text);
};

prototype.cloneNode = function(element){
  return element.cloneNode(true);
};
