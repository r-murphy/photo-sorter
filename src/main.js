"use strict"

const fs = require('fs');
const fsp = require('fs-plus');
const path = require('path');
const util = require('util');
const Promise = require("bluebird");
//const exiftool = require('exiftool');
// const metadata = Promise.promisify(exiftool.metadata.bind(exiftool));
const exiftool = require('exiftool-wrapper');
const moment = require('moment');
const fsRename = Promise.promisify(fs.rename);
const fsList = Promise.promisify(fsp.list);

const dirs = new Set();

let argv;

const globExtensions = [".jpg", ".mov", ".png", ".JPG", ".MOV", ".PNG"];

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

// const Filename_Formats = {
//   DS: "IMG_YYYYMMDD_HHmmss" //Synology Diskstation
// };

function verbose() {
  if (argv.verbose || argv.dryRun) {
    const args = Array.prototype.slice.call(arguments);
    if (argv.dryRun) {
      args.unshift("Would");
    }
    console.log.apply(console, args);
  }
}

function inspect(obj, depth) { //eslint-disable-line no-unused-vars
  if (depth === undefined) depth = null;
  console.log(util.inspect(obj, { depth: depth }));
}

function mkdirIfNeeded(md) {
  // inspect(md);
  const dir = md.TargetFolder;
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

function getNonconflictingTargetFilename(md) {
  const originalTarget = md.TargetPath;
  const targetParts = path.parse(originalTarget);
  let targetPath = originalTarget;
  let index = 0;
  while (fs.existsSync(targetPath)) {
    index++;
    const pathWithoutExt = path.join(targetParts.dir, targetParts.name);
    targetPath = `${pathWithoutExt} (${index})${targetParts.ext}`; //Let's hope there's not 2 files in the same second.
  }
  return targetPath;
}

function moveFile(md) {
  const fileName = md.FileName;
  const directory = md.Directory;
  const targetPath = getNonconflictingTargetFilename(md);
  if (argv.move) {
    verbose("move", fileName, "to", targetPath); //TODO get relative path
  }
  else {
    verbose("rename", fileName, "to", md.TargetName);
  }
  if (argv.dryRun) return;
  const sourcePath = path.join(directory, fileName);
  return fsRename(sourcePath, targetPath);
}

function getDate(md) {
  const type = md.FileType;
  const typeInfo = Types[type];
  if (!typeInfo) {
    console.log("Unknown type", type);
    inspect(md);
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

function determineTargetFilename(md) {
  const sourceFilename = md.FileName;
  if (!md.rename) {
    return sourceFilename;
  }
  const date = md.moment;
  const prefix = argv.prefix;
  const suffix = argv.suffix;
  const dateString = date.format("YYYYMMDD_HHmmss");
  const sourceFileNameParts = path.parse(sourceFilename);
  const targetNameBuffer = [];
  targetNameBuffer.push(prefix);
  const force = argv.force || !argv.appendOriginal;
  const alreadyHasDate = sourceFilename.includes(dateString);
  const alreadyHasPrefixAndDate = sourceFilename.startsWith(prefix) && alreadyHasDate;
  if (alreadyHasPrefixAndDate && !force) {
    console.log(`Skipping rename of ${sourceFilename} since appendOriginal is true and it contains the prefix and datestring.`);
    return sourceFilename;
  }
  if (force || !sourceFilename.includes(dateString)) {
    targetNameBuffer.push(dateString)
  }
  if (argv.appendOriginal) {
    targetNameBuffer.push(`__${sourceFileNameParts.name}`); //no extension
  }
  targetNameBuffer.push(suffix);
  return targetNameBuffer.join("") + sourceFileNameParts.ext
}

function mapTargetDetails(md) {
  const date = getDate(md);
  if (!date) {
    console.log("No date/time found for file", md.FileName);
    return md;
  }
  else {
    md.moment = date;
  }
  if (argv.move) {
    const targetFolderName = date.format("YYYY-MM"); //TODO use argv
    md.TargetFolder = path.resolve(argv.cwd, targetFolderName);
  }
  else {
    // Else we still need to set the directory for rename.
    md.TargetFolder = md.Directory;
  }
  md.TargetName = determineTargetFilename(md);
  md.TargetPath = path.join(md.TargetFolder, md.TargetName);
  return md;
}

function getMetadata(files) {
  if (!files.length) return [];
  // Wrap the exiftool call in a promise to catch any sync errors
  return Promise.resolve()
    .then(() => {
      return exiftool.metadata({
        source: files,
        // tags: ["FileType", "FileName", "Directory", "DateTimeOriginal", "CreationDate", "DateCreated"]
      });
    })
    .catch(error => {
      console.log(`Error processing one of:\n${files.join("\n")}`);
      throw error;
    });
}

function takeActionFilter(md) {
  if (!md.TargetPath) {
    // verbose(`Unable to determine date for ${md.FileName}`);
    return false;
  }
  else if (md.SourceFile === md.TargetPath) {
    verbose(`No filename change for ${md.FileName}`);
    return false;
  }
  return true;
}

function filterDotFiles(file) {
  return !file.startsWith(".")
}

function applyLimit(files) {
  if (argv.limit) {
    return files.slice(0, argv.limit);
  }
  else {
    return files;
  }
}

// exports.rename = function(args) {
//   argv = args;
//   return fsList(argv.cwd, globExtensions)
//     .then(files => getMetadata(files))
//     .map(md => mapTargetDetails(md))
//     .filter(md => noActionFilter(md))
//     .each(md => mkdirIfNeeded(md))
//     .each(md => moveFile(md))
//     .then(() => console.log("Done"));
// }

exports.organize = function(args) {
  if (args.verbose || args.dryRun) {
    inspect(args)
  }
  argv = args;
  return fsList(argv.cwd, globExtensions)
    // .tap(inspect)
    .filter(file => filterDotFiles(file))
    // .tap(inspect)
    .then(files => applyLimit(files))
    // .tap(inspect)
    .then(files => getMetadata(files))
    // .tap(inspect)
    .map(md => mapTargetDetails(md))
    // .tap(inspect)
    .filter(md => takeActionFilter(md))
    // .tap(inspect)
    .each(md => mkdirIfNeeded(md))
    // .tap(inspect)
    .each(md => moveFile(md))
    .then(files => console.log(`Done. Processed ${files.length} files.`));
}
