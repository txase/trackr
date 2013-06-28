/*
  Copyright (C) 2013 Chase Douglas <chase.douglas@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/* jshint node:true */

'use strict';

var esprima = require('esprima');

/* AST traversal */
function traverse(node, visitor, parent) {
  var key;
  var child;

  visitor(node, parent);

  for (key in node) {
    if (node.hasOwnProperty(key)) {
      child = node[key];
      if (typeof child === 'object' && child !== null) {
        if (Array.isArray(child)) {
          /* jshint loopfunc:true */
          child.forEach(function(child_node) {
            traverse(child_node, visitor, child);
          });
          /* jshint loopfunc:false */
        } else
          traverse(child, visitor, node);
      }
    }
  }
}

function get_function_list(code) {
  var tree = esprima.parse(code, { range: true, loc: true });
  var function_list = [];

  traverse(tree, function (node, parent) {
    var name;

    if (node.type === esprima.Syntax.FunctionDeclaration) {
      /* e.g. function my_func() {} */
      function_list.push({
        name: node.id.name,
        range: node.range,
        loc: node.loc,
        name_range: node.id.range,
        declaration: true
      });
    } else if (node.type === esprima.Syntax.FunctionExpression) {
      /* Try to get a meaningful name from the parent node */
      switch (parent.type) {
        case esprima.Syntax.AssignmentExpression:
          /* e.g. var my_func = function() {}; */
          name = code.slice(parent.left.range[0], parent.left.range[1]).replace(/"/g, '\\"');
          break;

        case esprima.Syntax.ObjectExpression:
        case esprima.Syntax.Property:
          /* e.g. {my_func: function() {}}; */
          name = parent.key.name ? parent.key.name : parent.key.value.toString();
          break;

        default:
          /* Try to get a name from the parent's id or default to [Anonymous] */
          name = parent.id ? parent.id.name : '[Anonymous]';
          break;
      }

      function_list.push({
        name: name,
        range: node.range,
        loc: node.loc
      });
    }
  });

  return function_list;
}

/* Front of wrapper we insert around traced functions */
function entry(fn) {
  return [
    'function' + (fn.declaration ? ' ' + fn.name : '') + '() {',
    '    var ret;',
    '    "Trace" in window && typeof Trace.entry === "function" && Trace.entry(' + JSON.stringify(fn) + ');',
    '    try {',
    '        ret = (\n'
  ].join('\n');
}

/* Back of wrapper we insert around traced functions */
function exit() {
  return [
    '        ).apply(this, Array.prototype.slice.call(arguments));',
    '    } catch(err) {',
    '        "Trace" in window && typeof Trace.exit === "function" && Trace.exit(err);',
    '        throw err;',
    '    }',
    '    "Trace" in window && typeof Trace.exit === "function" && Trace.exit(null, ret);',
    '    return ret;',
    '}'
  ].join('\n');
}

exports.trace = function(code, filename) {
  var function_list = get_function_list(code);
  var sort_data = [];

  /* Create a list of entries and exists of functions */
  function_list.forEach(function(fn, i) {
    sort_data.push({index: i, entry: true, pos: function_list[i].range[0]});
    sort_data.push({index: i, entry: false, pos: function_list[i].range[1]});
  });

  /* Make sure we do the next function entry before the previous function exit */
  sort_data.sort(function(a, b) {
    if (b.pos === a.pos)
      return (b.entry ? 1 : -1);

    return b.pos - a.pos;
  });

  /* Insert the instrumentation code from the last entry to ensure ranges stay valid */
  sort_data.forEach(function(sort_entry) {
    var fn = function_list[sort_entry.index];
    fn.filename = filename;
    delete fn.range;

    if (sort_entry.entry) {
      if (fn.declaration)
        code = code.slice(0, sort_entry.pos) + entry(fn) + code.slice(sort_entry.pos, fn.name_range[0]) + code.slice(fn.name_range[1], code.length);
      else
        code = code.slice(0, sort_entry.pos) + entry(fn) + code.slice(sort_entry.pos, code.length);
    } else
      code = code.slice(0, sort_entry.pos) + exit() + code.slice(sort_entry.pos, code.length);
  });

  return code;
};
