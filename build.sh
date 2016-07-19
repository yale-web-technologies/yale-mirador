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

if [ "$1" == "mirador" ]; then
  buildMirador
elif [ "$1" == "yale-mirador" ]; then
  buildYaleMirador
else
  buildMirador
  buildYaleMirador
fi

