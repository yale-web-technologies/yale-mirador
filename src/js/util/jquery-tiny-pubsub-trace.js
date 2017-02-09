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

  var scaffoldMap = {};

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

  var logging = function(str) {
    return debug && !exclude(str);
  };

  var scaffoldHandler = function(eventId, handler) {
    var scaffold = function() {
      log('PubSub:handler', eventId, handler, Array.prototype.slice.call(arguments));
      handler.apply(null, arguments);
    };
    scaffoldMap[handler] = scaffold;
    return scaffold;
  };

  var unscaffold = function(handler) {
    var scaffold = scaffoldMap[handler];
    delete scaffoldMap[handler];
    return scaffold;
  };

  var publish = $.publish;
  var subscribe = $.subscribe;
  var unsubscribe = $.unsubscribe;

  $.subscribe = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventId = args[0];
    var handler = args[1];

    if (logging(eventId)) {
      console.log('PubSub:subscribe', args);
      handler = scaffoldHandler(eventId, handler);
      args[1] = handler;
    };
    console.log('S', Object.keys(scaffoldMap).length);
    subscribe.apply(jQuery, args);
  };

  $.unsubscribe = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventId = args[0];
    var handler = args[1];

    if (logging(eventId)) {
      log('PubSub:unsubscribe', Array.prototype.slice.call(arguments));
      if (typeof args[1] === 'function') {
        args[1] = unscaffold(handler);
      }
    }
    console.log('U', Object.keys(scaffoldMap).length);
    unsubscribe.apply(jQuery, args);
  };

  $.publish = function() {
    var args = Array.prototype.slice.call(arguments);
    var eventId = args[0];
    if (logging(eventId)) {
      log('PubSub:publish', args);
    }
    publish.apply(jQuery, args);
  };

}(jQuery));
