var inherits = require('inh');

var Tracer = require('./tracer.js');

function Log() {
  arguments.callee.super_.prototype.constructor.call(this);
};

inherits(Log, Tracer);

Log.prototype.process_trace = function(context) {
  "use strict";

  var fn = context.info.name + ' (' + context.info.filename + ':' + context.info.loc.start.line + ':' + context.info.loc.start.column + ')';

  var style = 'font-weight:normal;';
  var percent = 1;
  if (context.parent !== null)
    percent = context.duration / context.parent.duration;
  if (percent >= 0.25)
    style += 'background-color:tomato;';
  else if (percent >= 0.05)
    style += 'background-color:khaki;';

  var logfn;
  if (context.children.length > 0) {
    if (percent >= 0.05)
      logfn = console.group.bind(console);
    else
      logfn = console.groupCollapsed.bind(console);
  } else
    logfn = console.log.bind(console);

  if (context.parent === null)
    console.groupCollapsed('Trace started in ' + fn + ' with duration ' + context.duration + 'us at ' + context.trace_start + ':');

  var message =
    '%c' +
    fn +
    ' (start: ' + (context.start - this.trace_start) + 'us' +
    ', duration: ' + context.duration + 'us' +
    ', self: ' + (context.duration - context.children_duration) + 'us' +
    ', fast calls not shown: ' + context.culled +
    (context.userdata ? ', user data: ' + JSON.stringify(context.userdata) : '') +
    ')';

  logfn(message, style);

  for (var i = 0; i < context.children.length; i++)
    this.process_trace(context.children[i]);

  if (context.children.length > 0)
    console.groupEnd();

  if (context.parent === null)
    console.groupEnd();
};

module.exports = Log;
