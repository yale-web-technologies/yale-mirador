[![Build Status](https://travis-ci.org/yale-web-technologies/yale-mirador.svg?branch=master)](https://travis-ci.org/yale-web-technologies/yale-mirador) [![Dependency Status](https://gemnasium.com/badges/github.com/yale-web-technologies/yale-mirador.svg)](https://gemnasium.com/github.com/yale-web-technologies/yale-mirador)

# Yale Mirador Extension
This projects embeds [Mirador](https://github.com/IIIF/mirador) and also
contains some modifications and extensions to it.

<!-- TOC -->

- [Yale Mirador Extension](#yale-mirador-extension)
  - [Definitions](#definitions)
  - [Download and Initial Setup](#download-and-initial-setup)
  - [Bulid](#bulid)
  - [Running the Example](#running-the-example)
  - [Test](#test)
  - [Deploy](#deploy)
    - [Dependency](#dependency)
    - [JavaScript](#javascript)
    - [Parameters](#parameters)
      - [Cookies](#cookies)
      - [JavaScript](#javascript-1)

<!-- /TOC -->

## Definitions
Some clarification of the terms we will be using because
it can get quite confusing:

* **IIIF Mirador**: the original Mirador project and its code at https://github.com/IIIF/mirador
* **Yale Core**: the Yale fork of Mirador with the same structure as "IIIF Mirador" but with the minimal code modifications we had to made to make it work with the embedding environment. (https://github.com/yale-web-technologies/mirador)
* **Yale Extension**: this project. It has its own project structure and includes additional JavaScript and styles added on top of "Mirador Core".

## Download and Initial Setup

```bash
git clone --recursive git@github.com:yale-web-technologies/yale-mirador.git
cd yale-mirador
npm install  # Install node modules for yale-mirador
```

## Bulid

```
npm run build
```
It runs `webpack` for Yale Extension and
creates output files in `dist/`.
It also copies the Mirador-y distribution code from `node_modules/` to `dist/`.

## Running the Example
```
npm start
```

It will open a browser and run the instance there. You can also
open `http://localhost:3000` manually.

## Test

Install `karma-cli` globally so the `karma` command becomes available.
```
npm install -g karma-cli
```

Run all tests
```
npm test
```

Run a single test file
```
npm test -- -f <test-file>
npm test -- -f test/state-store.test.js  # for example
```

## Deploy

### Dependency
See `package.json` for dependencies &ndash; note the version requirements. Notably you should include
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

#### Cookies

* `loggedIn`: `'true'` or `'false'`
* `isEditor`: `'true'` or `'false'`

#### JavaScript

See `index.html` and `config.js` to see an example of initiating the app.
