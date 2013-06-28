function TraceBase() {
  throw new Error('TraceBase is an abstract base class and should not be instantiated');
};

if ('performance' in global && 'now' in global.performance)
  TraceBase.prototype._now = global.performance.now.bind(global.performance);
else if ('performance' in global && 'webkitNow' in global.performance)
  TraceBase.prototype._now = global.performance.webkitNow.bind(global.performance);
else
  TraceBase.prototype._now = Date.now.bind(Date);

TraceBase.prototype.now = function() {
  return Math.round(this._now() * 1000);
};

TraceBase.prototype.open = function() {};

module.exports = TraceBase;
