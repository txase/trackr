var inherits = require('inh');

var TraceBase = require('./trace_base.js');

function CallGraph() {
  "use strict";

  this.context = {
    name: 'Program',
    start: this.now(),
    children_duration: 0,
    max_depth: 1
  }
  this.root = this.context;
  this.depth = 1;
  this.noop_count = 0;
};

inherits(CallGraph, TraceBase);

CallGraph.prototype.entry = function(info) {
  "use strict";

  if (this.context === null) {
    if (this.noop_count === 0) {
      var freq = ('trace' in window && 'frequency' in window.trace ? window.trace.frequency : 1000);
      if (freq < 1 || Math.random() * freq > 1)
        this.noop_count = 1;
    } else
      this.noop_count++;
  }

  if (this.noop_count === 0) {
    var start = this.now();
    var key = info.filename + ':' + info.loc.start.line + ':' + info.loc.start.column;
    var index;

    var context;
    if ('children_hash' in this.context && key in this.context.children_hash) {
      index = this.context.children_hash[key];
      context = this.context.children[index];
    } else {
      context = {
        parent: this.context,
        name: info.name,
        info: info,
        called: 0,
        duration: 0,
        children_duration: 0
      };
      if ('children' in this.context)
        index = this.context.children.length;
      else {
        this.context.children = [];
        this.context.children_hash = {};
        index = 0;
      }
      this.context.children_hash[key] = index;
      this.context.children[index] = context;
    }

    this.depth++;
    if (this.depth > this.root.max_depth)
      this.root.max_depth = this.depth;

    context.called++;
    context.start = start;
    this.context = context;
  }
};

CallGraph.prototype.exit = function() {
  "use strict";

  var context = this.context;

  if (this.noop_count === 0) {
    var stop = this.now();
    var duration = stop - context.start;
    delete context.start;

    context.duration += duration;

    context.parent.children_duration += duration;

    this.depth--;

    this.context = context.parent;
    if (this.context === this.root)
      this.root.duration = this.root.children_duration;
  } else
    this.noop_count--;
};

module.exports = CallGraph;
