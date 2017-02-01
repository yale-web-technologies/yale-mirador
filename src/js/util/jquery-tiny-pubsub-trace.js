/**
 * Replaces/overrides jquery-tiny-pubsub code to print traces.
 * Include this file for debugging only! 
 */ 
(function($) {

  var debug = true;
  var trace = false;

  // Add strings or patterns to  array and
  // event names
  var excludePatterns = [];

  var exclude = function(str) {
    for (var i = 0; i < excludePatterns.length; ++i) {
      if (str.match(excludePatterns[i])) {
        return true;
      }
    }
    return false;
  };

  var log = function() {
    (trace ? console.trace : console.log).apply(console, arguments);
  };

  var okToLog = function(str) {
    return debug && !exclude(str);
  };

  var scaffoldHandler = function(eventId, handler) {
    return function() {
      log('PubSub:handler', eventId, handler, Array.prototype.slice.call(arguments));
      handler.apply(null, arguments);
    };
  };

  var o = $({});

  $.subscribe = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventId = args[0];
    var handler = args[1];
    if (okToLog(eventId)) {
      console.log('PubSub:subscribe', args);
      handler = scaffoldHandler(eventId, handler);
      args[1] = handler; 
    };
    o.on.apply(o, args);
    return handler;
  };

  $.unsubscribe = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventId = args[0];
    if (okToLog(eventId)) {
      log('PubSub:unsubscribe', Array.prototype.slice.call(arguments));
      if (typeof args[1] === 'function') {
        var handler = scaffoldHandler(eventId, argv[1]);
        args[1] = handler;
      }
    }
    o.off.apply(o, args);
  };

  $.publish = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventId = args[0];
    if (okToLog(eventId)) {
      log('PubSub:publish', args);
    }
    o.trigger.apply(o, args);
  };

}(jQuery));
