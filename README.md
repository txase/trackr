trackr
======
Trackr makes it easy to instrument your JavaScript code for function tracing. An object-oriented architecture provides abstractions for processing trace data in multiple ways, including linear tracing and call graph generation.

## Instrumenting
There are two ways of instrumenting the code running on your website: as part of the build process or by using a proxy server.

### Build Process
This method involves instrumenting the source code before deploying it. First, install trackr globally:

`npm install -g trackr`

Next, run your code through trackr to instrument it:

`trackr my_code.js > my_instrumented_code.js`

### Dynamic Instrumentation Using A Proxy Server
This method involves modifying your site's SCRIPT tag src attributes to fetch the sources from a proxy server. First, get trackr:

`git clone git://github.com/txase/trackr`

Next, install the dependencies:

`npm install`

Now start the server:

`npm start`

This will start the proxy server on port 3000 or whatever port you choose by setting the PORT environment variable. Now, transform all the script tag src attributes in your app. Transform them by:

1. Take the src URL and URI encode it.
1. Append the URI encoded src url as a query parameter named 'origin'
1. Change the host and port of the url to the host and port of the proxy server

For example:

`<script src="http://mydomain.com/js/Tutorial.js"></script>`

Becomes:

`<script src="http://localhost:3000/js/Tutorial.js?origin=http%3A%2F%2Fmydomain.com%2Fjs%2FTutorial.js"></script>`

## Collecting Data
The instrumentation provides a mechanism for collecting function trace data, but now we need a way to collate the data in a useful manner. The trackr project provides a collection of trace data analyzers. These are built from source files in the src/ directory and placed in public/. If you are running a proxy server, these analyzers are hosted directly by the server. Otherwise, you will need to serve the files in your app or elsewhere.

Simply add a new SCRIPT tag referencing one of these data analyzers before any of your other SCRIPT tags.

## Included Analyzers

### log.js
This analyzer outputs a linear trace of your code to the console. The trace logging uses groups, which seems to only work properly in Chrome. In other browser consoles the output may not look quite right.

## Included Analyzer Infrastructure
Analyzers collect data and provide some mechanism of showing the data to the user. The log.js analyzer, for example, logs the data to the console. Trackr has uses an object-oriented approach for providing analyzer infrastructure that can be reused to great effect.

Again, using log.js as an example, it is built on top of the Tracer class in src/implementation/tracer.js, which itself is built on top of the TraceBase class in src/implementation/trace_base.js. The Tracer class collects all the data. The log.js logging capability is provided by the Log class in src/implementation/log.js, which inherits from the Tracer class. The Tracer class is part of the analyzer infrastructure, and log.js is built on top of it to provide a complete analyzer. The following infrastructure is provided:

### Tracer
Tracer is a linear function trace collector.

### CallGraph
CallGraph is a trace collector that builds up a call graph.
