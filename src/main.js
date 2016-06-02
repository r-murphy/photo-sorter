#!/usr/bin/env node
"use strict"

const yargs = require('yargs');
const fs = require('fs');
const fsp = require('fs-plus');
const path = require('path');
const Promise = require("bluebird");
//const exiftool = require('exiftool');
// const metadata = Promise.promisify(exiftool.metadata.bind(exiftool));
const exiftool = require('exiftool-wrapper');
const moment = require('moment');
const fsRename = Promise.promisify(fs.rename);
const fsList = Promise.promisify(fsp.list);

let argv = (
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
    "no-move": {
      boolean: true,
      descibe: "Don't move the file (rename only)"
    },
    "no-orig": {
      boolean: true,
      describe: "Don't add the original filename as a suffix"
    },
    "dry-run": {
      alias: "n",
      describe: "Dry Run",
      boolean: true
    },
    verbose: {
      alias: "v",
      boolean: true,
      default: false
    }//,
    // recursive: {
    //   alias: "r",
    //   boolean: true,
    //   default: false
    // },
    // flatten: {
    //   boolean: true
    // },
    // output: {
    //   alias: "o",
    //   describe: "The base output directory"
    // }
  }).argv
);

// console.log(require('util').inspect(argv, { depth: null }));

let cwd = path.resolve(argv._[0] || process.cwd());
console.log(cwd);

function verbose() {
  if (argv.verbose) {
    var args = Array.prototype.slice.call(arguments);
    if (argv.dryRun) {
      args.unshift("Would");
    }
    console.log.apply(console, args);
  }
}

let dirs = new Set();
function mkdirIfNeeded(md) {
  let dir = md.TargetFolder;
  if (!dirs.has(dir)) {
    dirs.add(dir);
    if (!fs.existsSync(dir)) {
      verbose("mkdir", dir);
      if (!argv.dryRun) {
        fs.mkdirSync(dir);
      }
    }
  }
}

function moveFile(md) {
  // console.log(require('util').inspect(md, { depth: null }));
  let fileName = md.FileName;
  let directory = md.Directory;
  let targetPath = md.TargetPath;
  var action = argv.noMove ? "rename" : "move";
  verbose(action, fileName, "to", targetPath);
  // console.log(argv.dryRun);
  if (argv.dryRun) return;
  return fsRename(path.join(directory, fileName), targetPath);
}

const Types = {
  JPEG: {
    tag: "DateTimeOriginal",
    pattern: "YYYY:MM:DD HH:mm:ss"
  },
  MOV: {
    tag: "CreationDate",
    pattern: "YYYY:MM:DD HH:mm:ss+-ZZ:ZZ"
  },
  PNG: {
    tag: "DateCreated",
    pattern: "YYYY:MM:DD HH:mm:ss"
  }
};

function getDate(md) {
  const type = md.FileType;
  const typeInfo = Types[type];
  if (!typeInfo) {
    console.log("Unknown type", type);
    console.log(require('util').inspect(md, { depth: null }));
    return null;
  }
  const string = md[typeInfo.tag];
  if (string) {
    return moment(string, typeInfo.pattern);
  }
  else {
    return null;
  }
}

function appTargetDetails(md) {
  // console.log(require('util').inspect(md, { depth: null }));
  const date = getDate(md);
  const fileNameParts = path.parse(md.FileName);
  if (date) {
    if (!argv.noMove) {
      const targetFolderName = date.format("YYYY-MM"); //TODO use argv
      md.TargetFolder = path.resolve(cwd, targetFolderName);
    }
    else {
      md.TargetFolder = md.Directory;
    }
    md.moment = date;
    const targetNameBuffer = [date.format("YYYYMMDD-HHmmss")];
    if (!argv.noOrig) {
      targetNameBuffer.push(fileNameParts.name); //no extension
    }
    md.TargetName = targetNameBuffer.join("__") + fileNameParts.ext;
    md.TargetPath = path.join(md.TargetFolder, md.TargetName);
    return md;
  }
  console.log("No date/time found for file", md.FileName);
  return md;
}

function getMetadata(files) {
  return exiftool.metadata({
    source: files,
    // tags: ["FileType", "FileName", "Directory", "DateTimeOriginal", "CreationDate", "DateCreated"]
  });
}

fsList(cwd, [".JPG", ".MOV", ".PNG"])
  .then(files => getMetadata(files))
  .map(md => appTargetDetails(md))
  .filter(md => !!md.TargetPath)
  .each(md => mkdirIfNeeded(md))
  .each(md => moveFile(md))
  .then(() => console.log("Done"))
  .catch(error => {
    console.error(error);
  });
