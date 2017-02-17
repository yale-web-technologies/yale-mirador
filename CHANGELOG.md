# Changelog

This file should be updated before a new release is deployed.

## 0.4.5 <small>2/17/2017</small>
* Fix MenuTagSelector bug - chapter items were not being set up correctly, with blank text and no event handling

## 0.4.4 <small>2/15/2017</small>
* Remove main menu at the top and add "+" icon in the windows for adding a new annotation window.
* Refactor for easier testing

## 0.4.3 <small>2/10/2017</small>
* New parameter from server: fixAnnoCellHeight, default (boolean) value that determines whether to show all annotation cells with equal height.

## 0.4.2 <small>2/7/2017</small>
* Bug fix: clicking on an annotation cell wouldn't let other annotations windows scroll to the "sibling" item, because currentLayerId wasn't being set when the annotation windows get first created.

## 0.4.1 <small>2/7/2017</small>
* Bug fixes + refactoring

## 0.4.0 <small>1/30/2017</small>
* Remove submodule mirador. It is now installed as an NPM module (mirador-y).

## 0.3.2 <small>1/30/2017</small>
* Add scaffold to tiny pubsub so callbacks can be traced.

## 0.3.1 <small>1/26/2017</small>
* Remember the last layer the user has selected and make it default for the next instantiation of LayerSelector.
* Reinstate client side cache.

## 0.3.0 <small>1/13/2017</small>
* Use external components (joosugi and joosugi-semantic-ui) for handling annotation.
* Use npm-version.

## 0.2.1 <small>11/17/2016</small>
* Take `data-group-id` from HTML and use it (`?group_id={{id}}`) to qualify requests for layers to the annotation server.
