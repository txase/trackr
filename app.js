
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var Seq = require('seq');
var instrument = require('./lib/instrument');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(__dirname + '/public'));
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('*', function(req, res) {
  if (!('origin' in req.query)) {
    res.statusCode = 400;
    return res.end();
  }

  Seq()
    .seq('fetch', function() {
      http.get(req.query.origin, this.ok.bind(this)).on('error', this);
    })
    .seq('retrieve', function(fetchres) {
      var seq = this;

      if (fetchres.statusCode !== 200) {
        res.statusCode = 500;
        return res.end();
      }

      var data = [];
      fetchres.on('data', function(chunk) {
        data.push(chunk);
      });
      fetchres.on('end', function() {
        seq.ok(Buffer.concat(data));
      });
      fetchres.on('close', function() {
        res.statusCode = 500;
        return res.end();
      });
    })
    .seq('instrument', function(code) {
      try {
        code = instrument.trace(code.toString(), req.query.origin);
      } catch (err) {
        return this(err);
      }

      res.setHeader('Content-Type', 'application/javascript');
      res.end(code);
    })
    ['catch'](function(err, stage) {
      console.error('Failed to instrument code in stage ' + stage + ': ' + err.stack);
      res.statusCode = 500;
      res.end();
    });
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
