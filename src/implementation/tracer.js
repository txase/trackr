var inherits = require('inh');

var TraceBase = require('./trace_base.js');

function Tracer() {
  "use strict";

  this.context = null;
  this.trace_start = null;
  this.call_count = 0;
  this.call_durations = [];
  this.min_duration = 0;
  this.noop_count = 0;
};

inherits(Tracer, TraceBase);

Object.defineProperty(Tracer.prototype, 'userdata', {
  get: function() {
    if (this.context)
      return this.context.userdata;
    else
      return null;
  },
  set: function(data) {
    if (this.context)
      this.context.userdata = data;
  }
});

Tracer.prototype.entry = function(info) {
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
    if (this.trace_start === null)
      this.trace_start = start;

    var context = {
      info: info,
      start: start,
      parent: this.context,
      children: [],
      children_duration: 0,
      culled: 0
    };

    if (this.context)
      this.context.children.push(context);
    else
      context.trace_start = new Date().toISOString();

    this.context = context;
  }
};

Tracer.prototype.exit = function() {
  "use strict";

  var context = this.context;

  if (this.noop_count === 0) {
    var stop = this.now();

    context.duration = stop - context.start;

    if (context.parent !== null)
      context.parent.children_duration += context.duration;

    if (context.duration < this.min_duration) {
      if (context.parent !== null) {
        context.parent.children.pop();
        context.parent.culled++;
      }
    } else {
      this.call_count++;
      if (context.duration in this.call_durations)
        this.call_durations[context.duration].push(context);
      else
        this.call_durations[context.duration] = [context];

      var maxcalls = ('trace' in window && 'maxcalls' in window.trace ? window.trace.maxcalls : 100);
      if (this.call_count > maxcalls) {
        this.call_durations.every(function(contexts, duration) {
          "use strict";

          this.min_duration = duration + 1;

          for (var i in contexts) {
            var context = contexts[i];
            var index = context.parent.children.indexOf(context);
            context.parent.children.splice(index, 1);
            context.parent.culled++;
            this.call_count -= 1 + context.children.length;
          }

          delete this.call_durations[duration];
          return false; // Only delete the fastest calls
        }, this);
      }

      if (context.parent === null) {
        var threshold = ('trace' in window && 'threshold' in window.trace ? window.trace.threshold : 10000);
        if (context.duration >= threshold && typeof this.process_trace === 'function')
          this.process_trace(context);
      }
    }

    this.context = context.parent;
    if (this.context === null) {
      this.trace_start = null;
      this.call_count = 0;
      this.call_durations = [];
      this.min_duration = 0;
    }
  } else
    this.noop_count--;
};

module.exports = Tracer;
