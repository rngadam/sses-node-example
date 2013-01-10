
/**
 * Module dependencies.
 */

var express = require('express');
var routes  = require('./routes');
var redis   = require('redis');
var prozess = require('prozess');

var app = module.exports = express.createServer();

var USE_REDIS = true;
var TOPIC = "syslog";

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
  res.render('index');
});

app.get('/update-stream', function(req, res) {
  // let request last as long as possible
  req.socket.setTimeout(Infinity);

  var messageCount = 0;
  if(USE_REDIS) {
    console.log("Instantiating Redis subscriber");
    var subscriber = redis.createClient();
    subscriber.subscribe(TOPIC);
  } else {
    console.log("Instantiating Kafka subscriber");
    var options = {
      host : 'localhost',
      topic : TOPIC,
      partition : 0,
      offset : 0,
      interval: 1000
    };

    // TODO: Create one EventEmitter per connected browser?!
    // Should be one per process
    var subscriber = new prozess.EventEmitter(options);
  }

  console.log("New incoming subscriber");

  subscriber.on("connected", function() {
    console.log('subscriber connected');
  });
  // In case we encounter an error...print it out to the console
  subscriber.on("error", function(err) {
    console.log("subscriber Error: " + err);
  });

  // When we receive a message from the redis connection
  subscriber.on("message", function(channel, message) {
    messageCount++; // Increment our message count

    res.write('id: ' + messageCount + '\n');
    res.write("data: " + message + '\n\n'); // Note the extra newline
  });

  //send headers for event-stream connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  // The 'close' event is fired when a user closes their browser window.
  // In that situation we want to make sure our redis channel subscription
  // is properly shut down to prevent memory leaks...and incorrect subscriber
  // counts to the channel.
  req.on("close", function() {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});

// TODO: original example also enable clients to publish between themselves
// app.get('/fire-event/:event_name', function(req, res) {
//   publisherClient.publish( 'updates', ('"' + req.params.event_name + '" page visited') );
//   res.writeHead(200, {'Content-Type': 'text/html'});
//   res.write('All clients have received "' + req.params.event_name + '"');
//   res.end();
// });
app.listen(8000);

console.log("Express server listening on port %d in %s mode",
  app.address().port, app.settings.env);

