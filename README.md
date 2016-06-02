# NodeJS Photo Sorter

A little command line utility to sort photos and movies, and/or rename them with a date/time stamp for merging with multiple sources.

- Currently only sorts into folders named as YYYY-MM.
- Currently supports PNG, MOV, JPG extensions

## Requirements

- Node 5+ or Node babel
- exiftool (`brew install exiftool`)

## Installation

```sh
clone
cd photo-sorter
npm install
npm link
```

## Usage

```sh
photo-sorter [options] <src_dir>
Options:
  --help         Show help
  --no-move      Don't move the file (rename only)
  --no-orig      Don't add the original filename as a suffix
  --dry-run, -n  Dry Run
  --verbose, -v
```

The default behaviour is:
- Rename the file as `YYYYMMDD-HHmmss__<original>.ext`
- Move the file into a folder named as `YYYY-MM`


## TODO

- no-rename option (move only)
- Fix the CLI usage/help
- Remove the strict extension filter
- Support recursive dirs, and either flattening or nested date subfolders
- Support output base dir option
- Support output subdir options (YYYY, YYYY-MM-DD, YYYY-MM (MMM), etc... or dynamic)
- Dynamic output date time pattern
- rc file in cwd or home

## Contributing

Yes please.