#!/usr/bin/env node
"use strict"

const yargs = require('yargs');
const path = require('path');
const deduper = require('../src/deduper');

const argv = (
  yargs
  .require(1)
  .help('help')
  // .demand('d')
  .options({
    // move: {
    //   alias: "m",
    //   choices: ["", "ym", "ymm", "ymd", "y"],
    //   default: "ym"
    // },
    // "m": {
    //   alias: "move",
    //   boolean: true,
    //   default: true,
    //   describe: "Move the file to a folder if applicable."
    // },
    // "r": {
    //   alias: "rename",
    //   boolean: true,
    //   default: false,
    //   describe: "Whether to rename the file."
    // },
    // "a": {
    //   alias: "append-original",
    //   boolean: true,
    //   default: true,
    //   describe: "Add the original filename as a suffix, when renaming."
    // },
    // "p": {
    //   alias: "prefix",
    //   default: "IMG_",
    //   describe: "Filename prefix."
    // },
    // "s": {
    //   alias: "suffix",
    //   default: "",
    //   describe: "Filename suffix."
    // },
    "n": {
      alias: "dry-run",
      describe: "Dry Run",
      boolean: true
    },
    // "l": {
    //   alias: "limit",
    //   describe: "File limit"
    // },
    "v": {
      alias: "verbose",
      boolean: true
    },
    "r": {
      alias: "recursive",
      boolean: true,
      default: false
    },
    // flatten: {
    //   boolean: true
    // },
    // output: {
    //   alias: "o",
    //   describe: "The base output directory"
    // }
  }).argv
);

const cwd = path.resolve(argv._[0] || process.cwd());
console.log(cwd);
argv.cwd = cwd;

deduper(argv)
  .catch(error => {
    console.error(error.stack);
    process.exit(1);
  });
