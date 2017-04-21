#!/bin/sh

# Copy 3rd party library files to dist/ folder.
# Meant to be called by 'npm run copy:libs' in package.json

LIB_DIR=dist/lib
DEXIE_SRC=node_modules/dexie/dist
GOLDEN_LAYOUT_SRC=node_modules/golden-layout
GOLDEN_LAYOUT_TGT=$LIB_DIR/goldenlayout
JS_COOKIE_SRC=node_modules/js-cookie/src
SEMANTIC_UI_SRC=lib/semantic/dist
SEMANTIC_UI_TGT=$LIB_DIR/semantic

set -o xtrace

mkdir -p $LIB_DIR
rm -rf ${LIB_DIR:?}/*
cp $DEXIE_SRC/dexie.min.js $DEXIE_SRC/dexie.min.js.map $LIB_DIR/

mkdir -p $GOLDEN_LAYOUT_TGT
cp $GOLDEN_LAYOUT_SRC/src/css/goldenlayout-base.css $GOLDEN_LAYOUT_TGT/
cp $GOLDEN_LAYOUT_SRC/src/css/goldenlayout-dark-theme.css $GOLDEN_LAYOUT_TGT/
cp $GOLDEN_LAYOUT_SRC/dist/goldenlayout.min.js $GOLDEN_LAYOUT_TGT/

cp $JS_COOKIE_SRC/js.cookie.js $LIB_DIR/

mkdir -p $SEMANTIC_UI_TGT/themes
cp -r $SEMANTIC_UI_SRC/themes/default $SEMANTIC_UI_TGT/themes/
cp $SEMANTIC_UI_SRC/semantic.min.css $SEMANTIC_UI_TGT/
cp $SEMANTIC_UI_SRC/semantic.min.js $SEMANTIC_UI_TGT/
