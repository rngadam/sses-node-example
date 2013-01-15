function startBenchmark() {
  console.log('starting benchmark');
  String.prototype.startsWith = function(str) {return (this.match("^"+str)==str)}
  var source = new EventSource('/update-stream');
  var lastCounter = null;
  var lastTime = null;
  var start = null;
  var lastMessageTime ;
  var messageReceived;
  var outOfSequence ;
  var outOfSequenceFound ;
  var outOfSequenceCounters;
  var sequential;

  function reset() {
      lastCounter = 0;
      messageReceived = 0;
      outOfSequence = 0;
      outOfSequenceFound = 0;
      outOfSequenceCounters = {};
      sequential = 0;
  }

  reset();

  setInterval(function() {
    if(start == null) {
      start = new Date().getTime();
    }
    var current = new Date().getTime();
    var delta = (current - start);

    var messagePerSecond = messageReceived/Math.ceil(delta/1000);
    var msg = 'messageReceived ' + messageReceived
      + ' messagePerSecond ' + messagePerSecond.toFixed(2)
      + ' outOfSequence ' + outOfSequence
      + ' outOfSequenceFound ' + outOfSequenceFound
      + ' sequential ' + sequential;

    $('p').text(msg);
    if(messageReceived != 0 && (current - lastMessageTime) > 2000) {
      console.log('resetting...');
      console.log('last test ' + msg);
      var totalReceived = outOfSequence + outOfSequenceFound + sequential;
      $('ul').append('<li>' + msg + ' totalReceived: ' + totalReceived + ' </li>');
      start = current;
      reset();
    }

  }, 1000);

  source.addEventListener('message', function(e) {
    //console.log(e);
    event = JSON.parse(e.data);
    // we're starting a new test...
    if(messageReceived == 0) {
      start = new Date().getTime();
    }

    lastMessageTime =  new Date().getTime();

    //console.log('messagePerSecond:' + messagePerSecond);
    data = event.msg.split(',').map(function( num ) {
      return parseFloat( num, 10 ) });
    // payload = "%d,%d" % (msgcounter,current)
    if(data.length == 2) {
      messageReceived++;
      if(lastCounter>0) {
        var counter = data[0];
        var expectedCounter = lastCounter + 1;
        if(counter == expectedCounter) {
          //console.log("sequential");
          sequential++;
        } else {
          //console.log("not sequential, expected " + (lastCounter + 1) + " got " + counter);
          if(outOfSequenceCounters[counter]) {
            //console.log('outOfSequenceCounter found later' + counter);
            outOfSequenceFound++;
          } else {
            outOfSequenceCounters[expectedCounter] = true;
            outOfSequence++;
          }
        }
      } else {
        sequential++;
      }
      lastCounter = data[0];
      lastTime = data[1];
    } else {
      console.log('Not a test message ' + event.msg);
    }
  }, false);
}