# Yale Mirador
This is an extension to [IIIF/Mirador](https://github.com/IIIF/mirador).
Hopefully much of the extended functionality will be merged into the IIIF/Mirador core
in the future.

## Definitions
Some clarification of the terms we will be using because
it can get quite confusing:

* **IIIF Mirador**: the "real" Mirador project and its code at https://github.com/IIIF/mirador
* **Mirador Core**: the Yale fork of Mirador with the same structure as "IIIF Mirador" but with the minimal code modifications we had to made to make it work with the embedding environment. (https://github.com/yale-web-technologies/mirador)
* **Yale Mirador**: this project. It has its own project structure and includes additional JavaScript and styles added on top of "Mirador Core".

## Download and Setup
```
git clone --recursive git@github.com:yale-web-technologies/yale-mirador.git
npm install
```

Note that the "Mirador Core" is defined as a git submodule of This
project, under `submodules/mirador`. 

## Bulid

```
build.sh
```
It runs `grunt` for "Mirador Core" and `webpack` for "Yale
Mirador", and
creates output files in `dist/`. 

## Running the example
```
cd example
./server.sh
```

Then open `http://localhost:3000` from a web browser.

## Deploy

### Dependency
See `package.json` for dependencies. Notably you should include
* [JavaScript Cookie](https://github.com/js-cookie/js-cookie)
* [Semantic UI](http://semantic-ui.com/)
* [Golden Layout](https://www.golden-layout.com/)

The app also depends on jQuery but it is embedded in "IIIF 
Mirador", which may complicate the asset management.

### JavaScript
"Golden Layout" should be included after "Mirador Core" and before "Yale Mirador" 
because it depends on jQuery, because "Mirador Core" embeds jQuery in itself,
and because "Yale Mirador" depends on it.

### Parameters

See `example/index.html` for the HTML required to run the app.
In addition to the IDs and classes of the HTML elements,
there are some parameters that must be passed through the `#viewer_template`
element:

* `data-settings-url`: The host site should implement an API endpoint for the JavaScript client to download server settings from. See below for the format of the payload.
* `data-manifest-url`: This is the URL of the IIIF manifest to load. Only one manifest will be loaded into a Mirador window at a time.
* `data-room-id`: ID of the "room" (or a project). Some settings (e.g. tagHierarchy) are defined per room. The host should 
figure out and manage the room IDs.

Server settings data from `data-settings-url`:
```
{
  {
    buildPath: '/mirador',
    tagHierarchy: null,
    endpointUrl: 'http://mirador-annotations-lotb.herokuapp.com'
  };
}
```

## Version String
Webpack generates (via [webpack-version-file-plugin](https://github.com/mvanede/webpack-version-file-plugin))
version.json under `dist/yale-mirador`.