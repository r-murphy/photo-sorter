#!/usr/bin/env node
"use strict"


const fs = require('fs');
const fsp = require('fs-plus');
const fse = require('fs-extra');
const path = require('path');
// const util = require('util');
const Promise = require("bluebird");
// const fsRename = Promise.promisify(fs.rename);
// const fsList = Promise.promisify(fsp.list);

// console.log(process);
const cwd = path.resolve(process.argv[2] || process.cwd());
console.log(cwd);

const argv = {
  cwd: cwd,
  recursive: true
};

function fixIt() {
  const files = argv.recursive ? fse.walkSync(argv.cwd) : fsp.listSync(argv.cwd);
  // const files = fsp.listSync(cwd);
  files.filter(file => !ignored(file))
  .forEach((file) => {
    const fileParts = path.parse(file);
    const nameParts = fileParts.name.split(" ");
    if (file.includes("_R3G")) {
      console.log(file);
      console.log(nameParts);
      const target = file.replace("_R3G", "_R5S");
      fs.renameSync(file, target);
    }
    // let digits = nameParts[2];
    // if (digits.length === 3) {
    //   digits = "0" + digits;
    // }
    // else if (digits.length === 4) {
    //   digits = "0" + digits;
    // }
    // console.log(digits);
    // const targetName = "IMG_" + digits + fileParts.ext;
    // const target = path.join(fileParts.dir, targetName);
    // console.log(target);
    // fs.renameSync(file, target);
  });
  return Promise.resolve();
}

function ignored(file) {
  const parts = path.parse(file);
  if (parts.name.startsWith(".")) {
    return true;
  }
  else if (parts.base === "Thumbs.db") {
    return true;
  }
  return false;
}

fixIt()
.catch(error => {
  console.error(error.stack);
  process.exit(1);
});
