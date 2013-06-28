#!/usr/bin/env node

var fs = require('fs');

var optparse = require('optparse');

var instrument = require('../lib/instrument');

var parser = new optparse.OptionParser([]);

parser.on(2, function(filename) {
  var script = fs.readFileSync(filename).toString();
  console.log(instrument.trace(script, filename));
});

parser.parse(process.argv);
