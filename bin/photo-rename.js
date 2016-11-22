#!/usr/bin/env node
"use strict"

const yargs = require('yargs');
const path = require('path');
const main = require('../src/main');

const argv = (
  yargs
  .require(1)
  .help('help')
  // .demand('d')
  .options({
    "a": {
      alias: "append-original",
      boolean: true,
      default: true,
      describe: "Add the original filename as a suffix."
    },
    "p": {
      alias: "prefix",
      default: "IMG_",
      describe: "Filename prefix."
    },
    "s": {
      alias: "suffix",
      default: "",
      describe: "Filename suffix."
    },
    "n": {
      alias: "dry-run",
      describe: "Dry Run",
      boolean: true
    },
    "v": {
      alias: "verbose",
      boolean: true
    },
    // TODO support this in the renamer
    // recursive: {
    //   alias: "r",
    //   boolean: true,
    //   default: false
    // },
  }).argv
);

const cwd = path.resolve(argv._[0] || process.cwd());
console.log(cwd);
argv.cwd = cwd;

// rename is just organizer with these options.
argv.move = false;
argv.rename = true;

main.organize(argv)
  .catch(error => {
    console.error(error.stack);
    process.exit(1);
  });
