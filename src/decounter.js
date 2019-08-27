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
  // inspect(args);
  console.dir({
    recursive: args.recursive,
    dryRun: args.dryRun
  }, {colors: true});
  return Promise.resolve()
    .then(() => getFileList())
    // .tap(inspect)
    // .tap(inspect)
    // .filter(file => toDecount(file))
    // .tap(inspect)
    .tap(files => {
      console.log(`Checking ${files.length} files.`);
    })
    .map(file => toTarget(file))
    .filter(file => !!file)
    // .tap(inspect)
    .tap(files => {
      console.log(`Trying ${files.length} files.`);
    })
    .mapSeries(file => rename(file))
    .filter(file => !!file)
    .tap(files => {
      console.log(`Renamed ${files.length} files.`);
    })
    // .tap(inspect)
    // .mapSeries(file => deleteOrRename(file))
    // .tap(inspect)
    // .tap(file => )
}

function getFileList() {
  if (argv.recursive) {
    return fse.walkSync(argv.cwd);
  }
  else {
    return fsp.listSync(argv.cwd);
  }
}

function inspect(obj, depth) { //eslint-disable-line no-unused-vars
  if (depth === undefined) depth = null;
  console.log(util.inspect(obj, { depth: depth }));
}

// function toDecount(file) {
//   return isPattern1(file);
// }

function rename(file) {
  // const origName = path.parse(pair.orig).base;
  const source = path.join(file.dir, file.base);
  const target = path.join(file.dir, file.target);
  if (fsp.existsSync(target)) {
    console.log(`Skipping rename. ${file.target} already exists.`);
    return;
  }
  else {
    // const shortName = path.parse(pair.short).base;
    // if (argv.verbose || argv.dryRun) {
    console.log(`${argv.dryRun ? "(Dryrun)" : ""}Renaming ${file.base} to ${file.target}`);
    // }
    if (argv.dryRun) {
      return file;
    }
    else {
      return fsRename(source, target).then(() => file);
    }
  }
}

//i.e. IMG_20110929_190026__IMG_0665_R5S-1.JPG
function isPattern1(filename) {
  return /^IMG.*_R5S[-]\d....$/.test(filename);
}

//i.e. IMG_20110929_190026__IMG_0665_ (1)R5S.JPG
function isPattern2(filename) {
  return /^IMG.*(\(\d\))_R5S[.]....?$/.test(filename);
}

//Missing extension
function isPattern3(filename) {
  return /R5S$/.test(filename);
}

/**
 */
function toTarget(file) {
  // process.exit(1);
  // const parts = file.split("__");
  const parsed = path.parse(file);
  const base = parsed.base;
  const name = parsed.name;
  // console.log(parsed);
  if (isPattern1(base)) {
    parsed.target = name.split("-").slice(0, -1).join("-") + parsed.ext;
  }
  else if (isPattern2(base)) {
    parsed.target = name.replace(/( \(\d\))/, "") + parsed.ext;
  }
  else if (isPattern3(base)) {
    // console.log("Pattern3");
    parsed.target = name + ".JPG";
  }
  else {
    return null;
  }
  return parsed;

  // if (parts.length < 4) {
  //   console.log("Ignoring unexpected filename", name);
  //   return null;
  // }
  // const shortParts = parts.slice(0,1).concat(parts.slice(3));
  // const short = shortParts.join("__");
  // return {
  //   orig: file,
  //   short: short
  // };
}

module.exports = deduper;
