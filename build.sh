#!/bin/sh

rootDir=`pwd`

miradorDestDir=$rootDir/dist/mirador

function buildMirador {
  cd submodules/mirador
  grunt
  mkdir -p $miradorDestDir
  cp -r build/mirador/* $miradorDestDir
}

function buildYaleMirador {
  cd $rootDir
  webpack
}

buildMirador
buildYaleMirador
