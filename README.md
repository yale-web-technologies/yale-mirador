[![Build Status](https://travis-ci.org/yale-web-technologies/yale-mirador.svg?branch=master)](https://travis-ci.org/yale-web-technologies/yale-mirador) [![Dependency Status](https://gemnasium.com/badges/github.com/yale-web-technologies/yale-mirador.svg)](https://gemnasium.com/github.com/yale-web-technologies/yale-mirador)

# Yale Mirador Extension
This is an extension to [IIIF/Mirador](https://github.com/IIIF/mirador).
Hopefully much of the extended functionality will be merged into the IIIF/Mirador core
in the future.

## Definitions
Some clarification of the terms we will be using because
it can get quite confusing:

* **IIIF Mirador**: the "real" Mirador project and its code at https://github.com/IIIF/mirador
* **Yale Core**: the Yale fork of Mirador with the same structure as "IIIF Mirador" but with the minimal code modifications we had to made to make it work with the embedding environment. (https://github.com/yale-web-technologies/mirador)
* **Yale Extension**: this project. It has its own project structure and includes additional JavaScript and styles added on top of "Mirador Core".

## Download and Setup
```
git clone --recursive git@github.com:yale-web-technologies/yale-mirador.git
cd yale-mirador
npm install  # Install node modules for yale-mirador
cd submodules/mirador
npm install -g grunt-cli
npm install  # Install node modules for the submodule mirador
```

Note that the "Yale Core" is defined as a git submodule of This
project, under `submodules/mirador`. 

## Bulid

```
npm run build
```
It runs `grunt` for "Mirador" and `webpack` for "Yale Mirador", and
creates output files in `dist/`. 

To build them separately,
```
npm run build:mirador
npm run build:yale-mirador
```

## Running the example
```
npm run start
```

Then open `http://localhost:3000` from a web browser.

## Test

Install `karma-cli` globally so the `karma` command becomes available.
```
npm install -g karma-cli
```

Make sure to build first to populate the `dist` folder, and
```
npm run test
```

## Deploy

### Dependency
See `package.json` for dependencies. Notably you should include
* [JavaScript Cookie](https://github.com/js-cookie/js-cookie)
* [Semantic UI](http://semantic-ui.com/)
* [Golden Layout](https://www.golden-layout.com/)

The app also depends on jQuery but it is embedded in "IIIF 
Mirador", which may complicate the asset management.

### JavaScript
"Golden Layout" should be included after "Yale Core" and before "Yale Extension" 
because it depends on jQuery, because "Yale Core" embeds jQuery in itself,
and because "Yale Extension" depends on it.

### Parameters

#### Via Cookies
* `loggedIn`: `'true'` or `'false'`
* `isEditor`: `'true'` or `'false'`

#### Via HTML

See `example/index.html` for the HTML required to run the app.
In addition to the IDs and classes of the HTML elements,
there are some parameters that must be passed through the `#viewer_template`
element:

* `data-settings-url`: The host site should implement an API endpoint for the JavaScript client to download server settings from. See below for the format of the payload.
* `data-manifest-url`: This is the URL of the IIIF manifest to load. Only one manifest will be loaded into a Mirador window at a time.
* `data-room-id`: ID of the "room" (or a project). Some settings (e.g. tagHierarchy) are defined per room. The host should 
figure out and manage the room IDs.

Optional (only when requested via the URL):
* `data-canvas-id`: e.g. `"http://manifests.ydc2.yale.edu/LOTB/canvas/bv11"`
* `data-toc-tags`: e.g. `"chapter22,scene2"`
* `data-layer-ids`: e.g. `"http://mirador-annotations-lotb.herokuapp.com/layers/Tibetan,http://mirador-annotations-lotb.herokuapp.com/layers/English"`

#### Via API

The client construct a URL `API_URL?room_id=ROOM_ID`
where `API_URL` is `data-settings-url` and `ROOM_ID` is `data-room-id` from above.

An example of the response from the API:
```
{
  {
    buildPath: '/mirador',
    tagHierarchy: null,
    endpointUrl: 'http://mirador-annotations-lotb.herokuapp.com'
  };
}
```

`buildPath` is the absolute URL root path under which all Yale-Mirador assets 
can be referenced.
(e.g. `/sites/all/modules/mirador-project/yale-mirador`) 

## Version String
Webpack generates (via [webpack-version-file-plugin](https://github.com/mvanede/webpack-version-file-plugin))
version.json under `dist/yale-mirador`.
