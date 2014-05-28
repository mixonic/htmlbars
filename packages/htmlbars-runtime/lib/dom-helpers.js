export function domHelpers() {
  return {
    appendText: function(element, text) {
      element.appendChild(document.createTextNode(text));
    },

    appendChild: function(element, childElement) {
      element.appendChild(childElement);
    },

    setAttribute: function(element, name, value) {
      element.setAttribute(name, value);
    },

    createElementNS: function(namespace, tagName) {
      return document.createElementNS(namespace, tagName);
    },

    createElement: function(tagName) {
      return document.createElement(tagName);
    },

    createDocumentFragment: function() {
      return document.createDocumentFragment();
    },

    createTextNode: function(text) {
      return document.createTextNode(text);
    },

    cloneNode: function(element) {
      return element.cloneNode(true);
    }
  };
}
