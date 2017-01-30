/**
 * Replaces/overrides jquery-tiny-pubsub code to print traces.
 * Include this file for debugging only! 
 */ 
(function($) {

  // Add strings or patterns to this array and
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
  var o = $({});

  $.subscribe = function() {
    var args = Array.prototype.slice.call(arguments);
    console.log('SUB', args);
    var eventType = args[0];
    var callback = args[1];
    args[1] = function() {
      if (!exclude(eventType)) {
        console.log('ACK ', eventType, Array.prototype.slice.call(arguments, 1));
      }
      callback.apply(null, arguments);
    };
    o.on.apply(o, arguments);
  };

  $.unsubscribe = function() {
    console.log('UNSUB', Array.prototype.slice.call(arguments));
    o.off.apply(o, arguments);
  };

  $.publish = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventType = args[0];
    if (!exclude(eventType)) {
      console.log('PUB', args);
    }
    o.trigger.apply(o, arguments);
  };

}(jQuery));
