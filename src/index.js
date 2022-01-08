import { fromString } from 'jsx-transform';

import path from 'path';
const Path = path;
import fs from 'fs';

// https://stackoverflow.com/a/47492545
// const isDirectory = path => fs.statSync(path).isDirectory();
// const getDirectories = path =>
//   fs.readdirSync(path).map(name => Path.join(path, name)).filter(isDirectory);
// const isFile = path => fs.statSync(path).isFile();  
// const getFiles = path =>
//   fs.readdirSync(path).map(name => Path.join(path, name)).filter(isFile);
// const getFilesRecursively = (path) => {
//   let dirs = getDirectories(path);
//   let files = dirs.map(dir => getFilesRecursively(dir)) // go through each directory
//                   .reduce((a,b) => a.concat(b), []);    // map returns a 2d array (array of file arrays) so flatten
//   return files.concat(getFiles(path));
// };

function prepender(name, contents) {
  const lines = contents.split('\n');
  let noCode = true;
  for(let i = 0; i < lines.length; i++) {
    const line = lines[i];

    console.log('LINE:', line);
    if (line.trim().startsWith('<')) {
      break;
    }
    if (line.trim() === '') {
      continue;
    }
    noCode = false;
    break;
  }
  if (noCode) {
    return `const ${name} = (props) => `;
  }
  return '';
}

function makeComponentNameFromPath(path) {
  const orig = Path.basename(path, '.jsx');
  // if any upper case, use that
  if (orig !== orig.toLowerCase()) {
    return ret;
  }
  // else split on hyphens and make Pascal case
  let ret = [];
  orig.split('-').forEach(x => {
    ret.push(x.slice(0, 1).toUpperCase() + x.slice(1));
  });
  return ret.join('');
}

const prelude = `
const BrayElem = {
  create: function(tag, attributes, children) {
    // TODO
  }
};
`;

const outro = `
const todoArgsFromCommandLine = { /*TODO*/ };
console.log(Main(todoArgsFromCommandLine).render());
`;

function testMain(options) {
  let paths = options.paths || [];
  let ret = [];
  ret.push(prelude);
  paths.forEach(path => {
    const origCode = fs.readFileSync(path, { encoding: 'utf-8' });
    let contents = fromString(origCode, { passUnknownTagsToFactory: true, factory: 'BrayElem.create'});
    // if first non-whitespace characters are not <xyz>, then prepend a small bit of boilerplate code on our behalf
    let final = prepender(makeComponentNameFromPath(path), origCode) + contents + ';\n';
    ret.push(final);
  });
  // TODO change outro based on arguments for writing to disk, or passing to further BrayElem processing function, or whatever...
  ret.push(outro);
  console.log(ret.join('\n'));
}

function main(options) {
  if (options) {
    serverMain(options);
  }
  options = {};
  if (process.argv.length <= 2) {
    //console.log(getUsage(sections));
    console.log("USAGE: todo");
    return;
  }
  const paths = process.argv.slice(2);
  console.warn(paths);

  //options = commandLineArgs(optionDefinitions);
  // TODO get command line arguments and pass these options
  options.paths = paths.filter(x => x.toLowerCase().endsWith('.jsx'));
  testMain(options);
}

// allow all .jsx files to passed by CLI using globbing (*.jsx)
// that way folders can do
//   bray my/path/*.jsx my/path/pdf/*.jsx
//   bray my/path/*.jsx my/path/html/*.jsx
// to allow different sets of primitives to output different
// types of document formats, but still share most of the document code/content

main();
