/**
 * Overrides jQuery tiny pubsub code to print traces.
 * Include this file for debugging only! 
 */ 
(function($) {

  var o = $({});

  $.subscribe = function() {
    console.log('SUB ' + Array.prototype.slice.call(arguments));
    o.on.apply(o, arguments);
  };

  $.unsubscribe = function() {
    console.log('UNS ' + Array.prototype.slice.call(arguments));
    o.off.apply(o, arguments);
  };

  $.publish = function() {
    var args = Array.prototype.slice.call(arguments);
    if (!args[0].match('updateTooltips.')) {
      console.log('PUB ' + args);
    }
    o.trigger.apply(o, arguments);
  };

}(jQuery));
