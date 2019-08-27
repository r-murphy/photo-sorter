"use strict"

const fs = require('fs');
const fsp = require('fs-plus');
const fse = require('fs-extra');
const path = require('path');
const util = require('util');
const Promise = require("bluebird");
//const exiftool = require('exiftool');
// const metadata = Promise.promisify(exiftool.metadata.bind(exiftool));
//const exiftool = require('exiftool-wrapper');
//const moment = require('moment');
const fsRename = Promise.promisify(fs.rename);
// const fsList = Promise.promisify(fsp.list);

let argv;

function deduper(args) {
  argv = args;
  console.dir({
    recursive: args.recursive,
    dryRun: args.dryRun
  }, {colors: true});
  return Promise.resolve()
    .then(() => getFileList())
    .tap(files => {
      console.log(`Checking ${files.length} files.`);
    })
    // .tap(inspect)
    .map(info => doIt(info))
    .filter(info => !!info)
    .tap(files => {
      console.log(`Processed ${files.length} files.`);
    })
    // .tap(inspect)
    // .mapSeries(file => deleteOrRename(file))
    // .tap(inspect)
    // .tap(file => )
}

function getFileList() {
  const files = argv.recursive ? fse.walkSync(argv.cwd) : fsp.listSync(argv.cwd);
  return files;
  // return files.map((file) => {
  //   return {
  //     file: file,
  //     stats: fse.statSync(file)
  //   };
  // })
}

function inspect(obj, depth) { //eslint-disable-line no-unused-vars
  if (depth === undefined) depth = null;
  console.log(util.inspect(obj, { depth: depth }));
}

function doIt(file) {
  // if (isPattern1(file)) {
  //   return doPattern1(file);
  // }
  if (isPattern2(file)) {
    return doPattern2(file);
  }
  return null;
}

function isPattern1(file) { //eslint-disable-line no-unused-vars
  return /IMG_.*__20.*/.test(file)
}

/**
 * For pattern2, we'll look for the long version first.
 * And if there is a matching short version, we'll delete the short version rather than the long.
 *  Short: IMG_20141101_112725H.JPG
 *  Long:  IMG_20141101_112725__IMG_0318H.JPG
 */
function isPattern2(file) {
  const name =  path.parse(file).name; //no extension
  const matches = /^IMG_\d{8}_\d{6}__IMG_\d{4}H$/.test(name);
  // console.log(name, ":", matches);
  // process.exit(1)
  return matches;
}

/*
 Pattern 1 action is to rename the long version to the short version,
 if the short version doesn't already exist.
 It will delete the long version if the short does exist (TODO use a flag for that).
  orig: IMG_20160331_083349__2016-03-31__08-33-49__IMG_6641_R5S.JPG
  short: IMG_20160331_083349__IMG_6641_R5S.JPG
 */
function doPattern1(file) { //eslint-disable-line no-unused-vars
  const name = path.parse(file).base;
  const parts = file.split("__");
  if (parts.length < 4) {
    console.log("Ignoring unexpected filename. Please fix the pattern1 regex.", name);
    return null;
  }
  const shortParts = parts.slice(0,1).concat(parts.slice(3));
  const short = shortParts.join("__");
  return deleteOrRename({
    orig: file,
    target: short
  });
}

/**
 * For pattern2, we have the long name.
 * And if there is a matching short version, we'll delete the short version rather than the long.
 *  Short: IMG_20141101_112725H.JPG
 *  Long:  IMG_20141101_112725__IMG_0318H.JPG
 */
function doPattern2(file) {
  const longFull = file;
  const parsed = path.parse(longFull);
  const nameParts = parsed.name.split("__");
  const shortBase = nameParts[0] + "H" + parsed.ext;
  const shortFull = path.join(parsed.dir, shortBase);
  if (fse.existsSync(shortFull)) {
    const longStats = fse.statSync(longFull);
    const shortStats = fse.statSync(shortFull);
    // console.log(parsed.dir);
    // console.log(shortBase, "<", parsed.base);
    // console.dir(longStats)
    // console.dir(shortStats);
    if (longStats.blksize !== shortStats.blksize) {
      console.log(`Block size is different between ${shortBase} and ${parsed.base}.`);
      //TODO prompt for deletion anyways.
      return null;
    }
    if (argv.dryRun) {
      console.log("Would remove short version", shortBase);
      return null;
    }
    else {
      console.log("Removing", shortBase);
      fsp.removeSync(shortFull);
      return true;
    }
    // process.exit(1);
  }
  // return {
  //
  // }
}

// function getBaseName(file) {
//   return path.parse(file).base;
// }

function deleteOrRename(pair) {
  const origName = path.parse(pair.orig).base;
  if (fsp.existsSync(pair.target)) {
    console.log(`Deleting ${origName}`);
    if (argv.dryRun) return;
    else return fsp.removeSync(pair.orig);
  }
  else {
    const shortName = path.parse(pair.target).base;
    console.log(`Renaming ${origName} to ${shortName}`);
    if (argv.dryRun) return;
    else return fsRename(pair.orig, pair.target);
  }
}

module.exports = deduper;
