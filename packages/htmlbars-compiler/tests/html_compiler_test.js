import { compile } from "htmlbars-compiler/compiler";
import { tokenize } from "simple-html-tokenizer";
import { hydrationHooks } from "htmlbars-runtime/hooks";
import { DOMHelper } from "htmlbars-runtime/dom-helper";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace = "http://www.w3.org/2000/svg";

function frag(element, string) {
  if (element instanceof DocumentFragment) {
    element = document.createElement('div');
  }

  var range = document.createRange();
  range.setStart(element, 0);
  range.collapse(false);
  return range.createContextualFragment(string);
}

var hooks, helpers;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function lookupHelper(helperName, context, options) {
  if (helperName === 'attribute') {
    return this.attribute;
  } else if (helperName === 'concat') {
    return this.concat;
  } else {
    return helpers[helperName];
  }
}

function compilesTo(html, expected, context) {
  var template = compile(html);
  var fragment = template(context, { hooks: hooks });

  equalHTML(fragment, expected === undefined ? html : expected);
  return fragment;
}

module("HTML-based compiler (output)", {
  setup: function() {
    helpers = {};
    hooks = hydrationHooks({ lookupHelper: lookupHelper });
  }
});

function equalHTML(fragment, html) {
  var div = document.createElement("div");

  div.appendChild(fragment.cloneNode(true));

  var fragTokens = tokenize(div.innerHTML);
  var htmlTokens = tokenize(html);

  function normalizeTokens(token) {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort();
    }
  }

  fragTokens.forEach(normalizeTokens);
  htmlTokens.forEach(normalizeTokens);

  deepEqual(fragTokens, htmlTokens);
}

test("Simple content produces a document fragment", function() {
  var template = compile("content");
  var fragment = template();

  equalHTML(fragment, "content");
});

test("Simple elements are created", function() {
  var template = compile("<h1>hello!</h1><div>content</div>");
  var fragment = template();

  equalHTML(fragment, "<h1>hello!</h1><div>content</div>");
});

test("Simple elements can have attributes", function() {
  var template = compile("<div class='foo' id='bar'>content</div>");
  var fragment = template();

  equalHTML(fragment, '<div class="foo" id="bar">content</div>');
});

test("Simple elements can have arbitrary attributes", function() {
  var template = compile("<div data-some-data='foo' data-isCamelCase='bar'>content</div>");
  var fragment = template();

  equalHTML(fragment, '<div data-some-data="foo" data-iscamelcase="bar">content</div>');
});

test("SVG element can have capitalized attributes", function() {
  var template = compile("<svg viewBox=\"0 0 0 0\"></svg>");
  var fragment = template();

  equalHTML(fragment, '<svg viewBox=\"0 0 0 0\"></svg>');
});

function shouldBeVoid(tagName) {
  var html = "<" + tagName + " data-foo='bar'><p>hello</p>";
  var template = compile(html);
  var fragment = template();


  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  var tag = '<' + tagName + ' data-foo="bar">';
  var closing = '</' + tagName + '>';
  var extra = "<p>hello</p>";
  html = div.innerHTML;

  QUnit.push((html === tag + extra) || (html === tag + closing + extra), html, tag + closing + extra, tagName + "should be a void element");
}

test("Void elements are self-closing", function() {
  var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr circle rect stop";

  voidElements.split(" ").forEach(function(tagName) {
    shouldBeVoid(tagName);
  });
});

test("The compiler can handle nesting", function() {
  var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content';
  var template = compile(html);
  var fragment = template();

  equalHTML(fragment, html);
});

test("The compiler can handle namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var fragment = template();

  equalHTML(fragment, html);
});

test("The compiler sets namespaces on namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var fragment = template();

  equal(fragment.namespaceURI, svgNamespace, "creates the svg element with a namespace");
  equalHTML(fragment, html);
});

test("The compiler sets namespaces on nested namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var fragment = template();

  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equalHTML(fragment, html);
});

test("The compiler sets a namespace on an HTML integration point", function() {
  var html = '<svg><foreignObject>Hi</foreignObject></svg>';
  var template = compile(html);
  var fragment = template();

  equal( fragment.namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equalHTML(fragment, html);
});

test("The compiler does not set a namespace on an element inside an HTML integration point", function() {
  var html = '<svg><foreignObject><div></div></foreignObject></svg>';
  var template = compile(html);
  var fragment = template();

  equal( fragment.childNodes[0].childNodes[0].namespaceURI, xhtmlNamespace,
         "creates the path element with a namespace" );
  equalHTML(fragment, html);
});

test("The compiler pops back to the correct namespace", function() {
  var html = '<svg></svg><svg></svg><div></div>';
  var template = compile(html);
  var fragment = template();

  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equal( fragment.childNodes[1].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equal( fragment.childNodes[2].namespaceURI, xhtmlNamespace,
         "creates the path element with a namespace" );
  equalHTML(fragment, html);
});

test("The compiler preserves capitalization of tags", function() {
  var html = '<svg><linearGradient id="gradient"></linearGradient></svg>';
  var template = compile(html);
  var fragment = template();

  equalHTML(fragment, html);
});

test("The compiler can handle quotes", function() {
  compilesTo('<div>"This is a title," we\'re on a boat</div>');
});

test("The compiler can handle newlines", function() {
  compilesTo("<div>common\n\nbro</div>");
  ok(true);
});

test("The compiler can handle simple handlebars", function() {
  compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle escaping HTML", function() {
  compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle unescaped HTML", function() {
  compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle simple helpers", function() {
  registerHelper('testing', function(context, params, options) {
    return context[params[0]];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle sexpr helpers", function() {
  registerHelper('testing', function(context, params, options) {
    return params[0] + "!";
  });

  compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
});

test("The compiler can handle multiple invocations of sexprs", function() {
  function evalParam(context, param, type) {
    if (type === 'id') {
      return context[param];
    } else {
      return param;
    }
  }

  registerHelper('testing', function(context, params, options) {
    return evalParam(context, params[0], options.types[0]) +
           evalParam(context, params[1], options.types[1]);
  });

  compilesTo('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', '<div>helloFOOBARlolBAZ</div>', { foo: "FOO", bar: "BAR", baz: "BAZ" });
});

test("The compiler tells helpers what kind of expression the path is", function() {
  registerHelper('testing', function(context, params, options) {
    return options.types[0] + '-' + params[0];
  });

  compilesTo('<div>{{testing "title"}}</div>', '<div>string-title</div>');
  compilesTo('<div>{{testing 123}}</div>', '<div>number-123</div>');
  compilesTo('<div>{{testing true}}</div>', '<div>boolean-true</div>');
  compilesTo('<div>{{testing false}}</div>', '<div>boolean-false</div>');
});

test("The compiler passes along the hash arguments", function() {
  registerHelper('testing', function(context, params, options) {
    return options.hash.first + '-' + options.hash.second;
  });

  compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
});

test("The compiler passes along the types of the hash arguments", function() {
  registerHelper('testing', function(context, params, options) {
    return options.hashTypes.first + '-' + options.hash.first;
  });

  compilesTo('<div>{{testing first="one"}}</div>', '<div>string-one</div>');
  compilesTo('<div>{{testing first=one}}</div>', '<div>id-one</div>');
  compilesTo('<div>{{testing first=1}}</div>', '<div>number-1</div>');
  compilesTo('<div>{{testing first=true}}</div>', '<div>boolean-true</div>');
  compilesTo('<div>{{testing first=false}}</div>', '<div>boolean-false</div>');
});

test("It is possible to override the resolution mechanism", function() {
  hooks.simple = function(context, name, options) {
    if (name === 'zomg') {
      return context.zomg;
    } else {
      return name.replace('.', '-');
    }
  };

  compilesTo('<div>{{foo}}</div>', '<div>foo</div>');
  compilesTo('<div>{{foo.bar}}</div>', '<div>foo-bar</div>');
  compilesTo('<div>{{zomg}}</div>', '<div>hello</div>', { zomg: 'hello' });
});

test("Simple data binding using text nodes", function() {
  var callback;

  hooks.content = function(morph, path, context, params, options) {
    callback = function() {
      morph.update(context[path]);
    };
    callback();
  };

  var object = { title: 'hello' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div>hello world</div>', object);

  object.title = 'goodbye';
  callback();

  equalHTML(fragment, '<div>goodbye world</div>');

  object.title = 'brown cow';
  callback();

  equalHTML(fragment, '<div>brown cow world</div>');
});

test("Simple data binding on fragments", function() {
  var callback;

  hooks.content = function(morph, path, context, params, options) {
    morph.escaped = false;
    callback = function() {
      morph.update(context[path]);
    };
    callback();
  };

  var object = { title: '<p>hello</p> to the' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div><p>hello</p> to the world</div>', object);

  object.title = '<p>goodbye</p> to the';
  callback();

  equalHTML(fragment, '<div><p>goodbye</p> to the world</div>');

  object.title = '<p>brown cow</p> to the';
  callback();

  equalHTML(fragment, '<div><p>brown cow</p> to the world</div>');
});

test("content hook receives escaping information", function() {
  expect(3);

  hooks.content = function(morph, path, context, params, options) {
    if (path === 'escaped') {
      equal(options.escaped, true);
    } else if (path === 'unescaped') {
      equal(options.escaped, false);
    }

    morph.update(path);
  };

  // so we NEED a reference to div. because it's passed in twice.
  // not divs childNodes.
  // the parent we need to save is fragment.childNodes
  compilesTo('<div>{{escaped}}-{{{unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Helpers receive escaping information", function() {
  expect(3);

  registerHelper('testing', function(context, params, options) {
    if (params[0] === 'escaped') {
      equal(options.escaped, true);
    } else if (params[0] === 'unescaped') {
      equal(options.escaped, false);
    }

    return params[0];
  });

  compilesTo('<div>{{testing escaped}}-{{{testing unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Attributes can use computed values", function() {
  compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});

test("Mountain range of nesting", function() {
  var context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
  compilesTo('{{foo}}<span></span>', 'FOO<span></span>', context);
  compilesTo('<span></span>{{foo}}', '<span></span>FOO', context);
  compilesTo('<span>{{foo}}</span>{{foo}}', '<span>FOO</span>FOO', context);
  compilesTo('{{foo}}<span>{{foo}}</span>{{foo}}', 'FOO<span>FOO</span>FOO', context);
  compilesTo('{{foo}}<span></span>{{foo}}', 'FOO<span></span>FOO', context);
  compilesTo('{{foo}}<span></span>{{bar}}<span><span><span>{{baz}}</span></span></span>',
             'FOO<span></span>BAR<span><span><span>BAZ</span></span></span>', context);
  compilesTo('{{foo}}<span></span>{{bar}}<span>{{argh}}<span><span>{{baz}}</span></span></span>',
             'FOO<span></span>BAR<span>ARGH<span><span>BAZ</span></span></span>', context);
  compilesTo('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}',
             'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH', context);
});

// test("Attributes can use computed paths", function() {
//   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
// });

function streamValue(value) {
  return {
    subscribe: function(callback) {
      callback(value);
      return { connect: function() {} };
    }
  };
}

function boundValue(valueGetter, binding) {
  var subscription;

  var stream = {
    subscribe: function(next) {
      subscription = next;
      callback();
      return { connect: function() {} };
    }
  };

  return stream;

  function callback() {
    subscription(valueGetter.call(binding, callback));
  }
}

test("It is possible to override the resolution mechanism for attributes", function() {
  hooks.attribute = function (context, params, options) {
    options.element.setAttribute(params[0], 'http://google.com/' + params[1]);
  };

  compilesTo('<a href="{{url}}">linky</a>', '<a href="http://google.com/linky.html">linky</a>', { url: 'linky.html' });
});

/*

test("It is possible to use RESOLVE_IN_ATTR for data binding", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
    return boundValue(function(c) {
      callback = c;
      return this[parts[0]];
    }, this);
  });

  var object = { url: 'linky.html' };
  var fragment = compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', object);

  object.url = 'clippy.html';
  callback();

  equalHTML(fragment, '<a href="clippy.html">linky</a>');

  object.url = 'zippy.html';
  callback();

  equalHTML(fragment, '<a href="zippy.html">linky</a>');
});
*/

test("Attributes can be populated with helpers that generate a string", function() {
  registerHelper('testing', function(context, params, options) {
    return context[params[0]];
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
/*
test("A helper can return a stream for the attribute", function() {
  registerHelper('testing', function(path, options) {
    return streamValue(this[path]);
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
*/
test("Attribute helpers take a hash", function() {
  registerHelper('testing', function(context, params, options) {
    return context[options.hash.path];
  });

  compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
/*
test("Attribute helpers can use the hash for data binding", function() {
  var callback;

  registerHelper('testing', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path] ? options.hash.truthy : options.hash.falsy;
    }, this);
  });

  var object = { on: true };
  var fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);

  object.on = false;
  callback();
  equalHTML(fragment, '<div class="nope">hi</div>');
});
*/
test("Attributes containing multiple helpers are treated like a block", function() {
  registerHelper('testing', function(context, params, options) {
    if (options.types[0] === 'id') {
      return context[params[0]];
    } else {
      return params[0];
    }
  });

  compilesTo('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', '<a href="http://foo.com/bar/baz">linky</a>', { foo: 'foo.com', bar: 'bar' });
});

test("Attributes containing a helper are treated like a block", function() {
  expect(2);

  registerHelper('testing', function(context, params, options) {
    deepEqual(params, [123]);
    return "example.com";
  });

  compilesTo('<a href="http://{{testing 123}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
});
/*
test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalHTML(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("A child resolution can pass contextual information to the parent", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalHTML(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("Attribute runs can contain helpers", function() {
  var callbacks = [];

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callbacks.push(c);
      return this[path];
    }, this);
  });

  registerHelper('testing', function(path, options) {
    return boundValue(function(c) {
      callbacks.push(c);

      if (options.types[0] === 'id') {
        return this[path] + '.html';
      } else {
        return path;
      }
    }, this);
  });

  var context = { url: "example.com", path: 'index' };
  var fragment = compilesTo('<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>', '<a href="http://example.com/index.html/linky">linky</a>', context);

  context.url = "www.example.com";
  context.path = "yep";
  callbacks.forEach(function(callback) { callback(); });

  equalHTML(fragment, '<a href="http://www.example.com/yep.html/linky">linky</a>');

  context.url = "nope.example.com";
  context.path = "nope";
  callbacks.forEach(function(callback) { callback(); });

  equalHTML(fragment, '<a href="http://nope.example.com/nope.html/linky">linky</a>');
});
*/
test("A simple block helper can return the default document fragment", function() {

  hooks.content = function(morph, path, context, params, options) {
    morph.update(options.render(context));
  };

  compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A simple block helper can return text", function() {
  hooks.content = function(morph, path, context, params, options) {
    morph.update(options.render(context));
  };

  compilesTo('{{#testing}}test{{else}}not shown{{/testing}}', 'test');
});

test("A block helper can have an else block", function() {
  hooks.content = function(morph, path, context, params, options) {
    morph.update(options.inverse(context));
  };

  compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A block helper can pass a context to be used in the child", function() {
  var content = hooks.content;
  hooks.content = function(morph, path, context, params, options) {
    if (path === 'testing') {
      options.hooks = this;
      morph.update(options.render({ title: 'Rails is omakase' }, options));
    } else {
      content.apply(this, arguments);
    }
  };

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("svg can live with hydration", function() {
  var template = compile('<svg></svg>{{name}}');

  var fragment = template({ name: 'Milly' }, { hooks: hooks });
  equal(
    fragment.childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
});

test("svg can take some hydration", function() {
  var template = compile('<div><svg>{{name}}</svg></div>');

  var fragment = template({ name: 'Milly' }, { hooks: hooks });
  equal(
    fragment.childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
  equalHTML( fragment, '<div><svg>Milly</svg></div>',
             "html is valid" );
});

test("root svg can take some hydration", function() {
  var template = compile('<svg>{{name}}</svg>');
  var fragment = template({ name: 'Milly' }, { hooks: hooks });
  equal(
    fragment.namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
  equalHTML( fragment, '<svg>Milly</svg>',
             "html is valid" );
});

test("Block helper allows interior namespace", function() {
  var isTrue = true;
  hooks.content = function(morph, path, context, params, options) {
    if (isTrue) {
      morph.update(options.render(context, options));
    } else {
      morph.update(options.inverse(context, options));
    }
  };

  var template = compile('{{#testing}}<svg></svg>{{else}}<div><svg></svg></div>{{/testing}}');

  var fragment = template({ isTrue: true }, { hooks: hooks });
  equal(
    fragment.childNodes[1].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );

  isTrue = false;
  fragment = template({ isTrue: false }, { hooks: hooks });
  equal(
    fragment.childNodes[1].namespaceURI, xhtmlNamespace,
    "inverse block path has a normal namespace");
  equal(
    fragment.childNodes[1].childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside an element inside a block is present" );
});

test("Block helper allows namespace to bleed through", function() {
  hooks.content = function(morph, path, context, params, options, helpers, dom) {
    morph.update(options.render(context, {data:options.data, dom: options.dom}));
  };

  var template = compile('<div><svg>{{#testing}}<circle />{{/testing}}</svg></div>');

  var fragment = template({ isTrue: true }, { hooks: hooks });
  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "svg tag has an svg namespace" );
  equal( fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
         "circle tag inside block inside svg has an svg namespace" );
});

test("Block helper with root svg allows namespace to bleed through", function() {
  hooks.content = function(morph, path, context, params, options, helpers, dom) {
    morph.update(options.render(context, {data:options.data, dom: options.dom}));
  };

  var template = compile('<svg>{{#testing}}<circle />{{/testing}}</svg>');

  var fragment = template({ isTrue: true }, { hooks: hooks });
  equal( fragment.namespaceURI, svgNamespace,
         "svg tag has an svg namespace" );
  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "circle tag inside block inside svg has an svg namespace" );
});

test("Block helpers receive hash arguments", function() {
  hooks.content = function(morph, path, context, params, options) {
    if (options.hash.truth) {
      options.hooks = this;
      morph.update(options.render(context, options));
    }
  };

  compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p>');
});
/*

test("Data-bound block helpers", function() {
  var callback;

  registerHelper('testing', function(path, options) {
    var context = this, firstElement, lastElement;

    var frag = buildFrag();

    function buildFrag() {
      var frag;

      var value = context[path];

      if (value) {
        frag = options.render(context);
      } else {
        frag = document.createDocumentFragment();
      }

      if (!frag.firstChild) {
        firstElement = lastElement = document.createTextNode('');
        frag.appendChild(firstElement);
      } else {
        firstElement = frag.firstChild;
        lastElement = frag.lastChild;
      }

      return frag;
    }

    callback = function() {
      var range = document.createRange();
      range.setStartBefore(firstElement);
      range.setEndAfter(lastElement);

      var frag = buildFrag();

      range.deleteContents();
      range.insertNode(frag);
    };

    return frag;
  });

  var object = { shouldRender: false };
  var template = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
  var fragment = compilesTo(template, '<p>hi</p> content  more <em>content</em> here', object);

  object.shouldRender = true;
  callback();

  equalHTML(fragment, '<p>hi</p> content <p>Appears!</p> more <em>content</em> here');

  object.shouldRender = false;
  callback();

  equalHTML(fragment, '<p>hi</p> content  more <em>content</em> here');
});
*/

test("Node helpers can modify the node", function() {
  registerHelper('testing', function(context, params, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
});

test("Node helpers can be used for attribute bindings", function() {
  var callback;

  registerHelper('testing', function(context, params, options) {
    var path = options.hash.href,
        element = options.element;

    callback = function() {
      var value = context[path];
      element.setAttribute('href', value);
    };

    callback();
  });

  var object = { url: 'linky.html' };
  var fragment = compilesTo('<a {{testing href="url"}}>linky</a>', '<a href="linky.html">linky</a>', object);

  object.url = 'zippy.html';
  callback();

  equalHTML(fragment, '<a href="zippy.html">linky</a>');
});


test('Web components - Called as helpers', function () {
  registerHelper('x-append', function(context, params, options, helpers) {
    var fragment = options.render(context, { hooks: hooks });
    fragment.appendChild(document.createTextNode(options.hash.text));
    return fragment;
  });
  var object = { bar: 'e', baz: 'c' };
  compilesTo('a<x-append text="d{{bar}}">b{{baz}}</x-append>f','abcdef', object);
});

test('Web components - Unknown helpers fall back to elements', function () {
  var object = { size: 'med', foo: 'b' };
  compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>','<x-bar class="btn-med">abc</x-bar>', object);
});

test('Web components - Text-only attributes work', function () {
  var object = { foo: 'qux' };
  compilesTo('<x-bar id="test">{{foo}}</x-bar>','<x-bar id="test">qux</x-bar>', object);
});

test('Web components - Empty components work', function () {
  compilesTo('<x-bar></x-bar>','<x-bar></x-bar>', {});
});

test('running a template again returns a cached fragment root', function () {
  var domHelper = new DOMHelper(document),
      template = compile("<div></div>", {}, domHelper),
      createElement = domHelper.createElement,
      calls = 0;

  domHelper.createElement = function(node){
    calls++;
    return createElement.call(this, node);
  };

  var fragmentA = template(),
      fragmentB = template();

  equal(calls, 1, "the domHelper is used once to create an element");
});

test('running a template with same domHelper returns a cached fragment root', function () {
  var template = compile("<div></div>"),
      domHelper = new DOMHelper(document),
      createElement = DOMHelper.prototype.createElement,
      calls = 0;

  domHelper.createElement = function(node){
    calls++;
    return createElement.call(this, node);
  };

  var fragmentA = template({}, {dom: domHelper}),
      fragmentB = template({}, {dom: domHelper});

  equal(calls, 1, "the domHelper is used once to create an element");
});

test('running a template with new domHelper returns a new fragment root', function () {
  var template = compile("<div></div>"),
      domHelperA = new DOMHelper(document),
      domHelperB = new DOMHelper(document),
      createElement = DOMHelper.prototype.createElement,
      aCalls = 0,
      bCalls = 0;

  domHelperA.createElement = function(node){
    aCalls++;
    return createElement.call(this, node);
  };

  domHelperB.createElement = function(node){
    bCalls++;
    return createElement.call(this, node);
  };

  var fragmentA = template({}, {dom: domHelperA}),
      fragmentB = template({}, {dom: domHelperB});

  equal(aCalls, 1, "the first domHelper is used once to create an element");
  equal(bCalls, 1, "the second domHelper is used once to create an element");
});

test("The compiler uses one namespace with nested elements", function() {
  var calls = 0;
  function MyDOMHelper(d, n){
    this.document = d;
    this.namespace = n;
    calls++;
  }
  MyDOMHelper.prototype = DOMHelper.prototype;
  MyDOMHelper.prototype.constructor = MyDOMHelper;

  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>',
      template = compile(html, {}, new MyDOMHelper(document));

  // Call the template, only the first should build the fragment
  template(); template(); template(); template();

  equal(calls, 2, "SVG namespace is initialized only once");
});

test("The compiler uses one namespace with many nested elements", function() {
  var calls = 0;
  function MyDOMHelper(d, n){
    this.document = d;
    this.namespace = n;
    calls++;
  }
  MyDOMHelper.prototype = DOMHelper.prototype;
  MyDOMHelper.prototype.constructor = MyDOMHelper;

  var html = '<div>Oh</div>\n<svg>\n<foreignObject>\n<div></div>\n</foreignObject>\n</svg>\n',
      template = compile(html, {}, new MyDOMHelper(document));

  // Call the template, only the first should build the fragment
  template(); template(); template(); template();

  equal(calls, 3, "SVG namespace is initialized only once");
});

test("The compiler passes an xhtml dom helper when inside an inner object", function() {
  expect(1);
  hooks.content = function(morph, path, context, params, options) {
    equal(options.dom.namespace, null, 'xhtml namesapce is passed in');
  };

  var html = '<svg><foreignObject>{{#testing}}{{/testing}}</foreignObject></svg>';
  var template = compile(html);
  template({}, {hooks:hooks});
});

test("The compiler passes an svg dom helper when inside svg", function() {
  expect(1);
  hooks.content = function(morph, path, context, params, options) {
    equal(options.dom.namespace, svgNamespace, 'svg namesapce is passed in');
  };

  var html = '<svg><linearGradient>{{#testing}}{{/testing}}</linearGradient></svg>';
  var template = compile(html);
  template({}, {hooks:hooks});
});
