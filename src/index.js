import { transformSync } from "@babel/core";
import path from 'path';
const Path = path;
import fs from 'fs';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url).replace('file://', '');
const __dirname = Path.dirname(__filename);

import commandLineArgs from 'command-line-args';
import getUsage from 'command-line-usage';

const optionDefinitions = [
  // { name: 'help', alias: 'h', type: Boolean, description: "print this usage help and exit" },
  { name: 'src', alias: 's', type: String, multiple: true, defaultOption: true, typeLabel: 'file.jsx ...',
    description: "(default if no flag specified) the input .jsx files to process" },
  // { name: 'args', alias: 'a', multiple:true, type: String, typeLabel: '[underline]{k:v} ...',
  //   description: "one or more k:v pairs passed to the template, where @k takes the value v, e.g.  tsvg --args k:v  results in k: 'v'  passed to template" },
  // { name: 'quiet', alias: 'q', type: Boolean,
  //   description: "produce no .svg ouput; generated .js code does not call  console.log(TSVG.Templates[<mine>]().render());  as is the default, for generating .svg files" },
  // { name: 'output', alias: 'o', type: String, typeLabel: '[underline]{to/file.js}',
  //   description: "combine all .js code from all .tsvg src files into a single .js file, instead of generating .svg file(s); turns on --quiet as well" },

  //NOPE
  // { name: 'node', alias: 'n', type: Boolean,
  //   description: "output Node.js-compatible args-parsing code, when used with --output. The resulting .js file can be used as a commandline script which can be passed args, e.g.\n$ node stem.js k0:v0 k1:v1" },
  // { name: 'global', alias: 'g', type: String,
  //   description: "define the global object to attach templates code to; for example  --global window generates code   window['TSVG'] = TSVG;  this turns on --quiet as well" },
  // { name: 'dev', alias: 'd', type: Boolean,
  //   description: "a special flag for development, to force TypeScript files to be recompiled each time tsvg binary runs" },
  //{ name: 'jshelper', alias: 'j', type: String } // a helper file (.js or .ts) that gets prepended
];

const sections = [
  {
    header: 'Bray',
    content: 'Turing-complete static document processing framework that can output many flavors of XML, using JSX and JavaScript'
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '$ bray input.jsx',
        example: '1. Transform input.jsx to JS code, call render, and dump XML to stdout.'
      },
      {
        desc: '$ bray example/simple/*.jsx -a width:100',
        example: '2. Transform all .jsx files and run Main(\\{width: 100\\}).render().'
      },
      {
        desc: '$ bray *.tsvg -o tsvg-all.js -g window',
        example: '3. TODOx'
      },
    ]
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  },
  {
    content: 'Project home: {underline https://github.com/jupdike/bray}'
  }
];

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
    //console.log('LINE:', line);
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

const prelude = fs.readFileSync(Path.join(__dirname, 'BrayElem.js'), { encoding: 'utf-8' });
//console.warn(prelude);

// last expression is 'returned' as result of eval()
const outro = `
const todoArgsFromCommandLine = { /*TODO*/ };
//console.log(Main(todoArgsFromCommandLine).renderToString());
Main(todoArgsFromCommandLine).renderToString();
`;

let jsxSettings = `/** @jsx BrayElem.create */
/** @jsxFrag BrayElem.Fragment */
`;

function transformCode(origCode) {
  let result = transformSync(jsxSettings + origCode,
    { plugins: ['@babel/plugin-transform-react-jsx'] });
  let ret = result.code;
  ret = ret.replace('/** @jsx BrayElem.create */', '');
  ret = ret.replace('/** @jsxFrag BrayElem.Fragment */', '');
  ret = ret.trim();
  while (ret.startsWith('\n')) {
    ret = ret.slice(1);
  }
  return ret;
}

function testMain(options) {
  let paths = options.src || [];
  let ret = [];
  ret.push(prelude);
  paths.forEach(path => {
    const origCode = fs.readFileSync(path, { encoding: 'utf-8' });
    let transformedCode = transformCode(origCode);
    // if first non-whitespace characters are not <xyz>, then prepend a small bit of boilerplate code on our behalf
    let final = prepender(makeComponentNameFromPath(path), origCode) + transformedCode + '\n';
    ret.push(final);
  });
  // TODO change outro based on arguments for writing to disk, or passing to further BrayElem processing function, or whatever...
  ret.push(outro);
  let code = ret.join('\n');
  //console.warn(code);
  let str = eval(code);
  console.log(str);
}

function main(options) {
  if (!options) {
    if (process.argv.length < 3) {
      const usage = getUsage(sections);
      console.error(usage);
      console.error('Error: expected one or more source files.');
      process.exit(1);
    }
    options = commandLineArgs(optionDefinitions);
    if (options.output || options.global) {
      options.quiet = true;
    }
    if (options.help) {
      const usage = getUsage(sections);
      console.error(usage);
      process.exit(1);
    }
    console.error('FOUND THESE OPTIONS:', options);
  }
  //const paths = process.argv.slice(2);
  //console.warn(paths);

  //options = commandLineArgs(optionDefinitions);
  // TODO get command line arguments and pass these options
  //options.paths = paths.filter(x => x.toLowerCase().endsWith('.jsx'));
  testMain(options);
}

// allow all .jsx files to passed by CLI using globbing (*.jsx)
// that way folders can do
//   bray my/path/*.jsx my/path/pdf/*.jsx
//   bray my/path/*.jsx my/path/html/*.jsx
// to allow different sets of primitives to output different
// types of document formats, but still share most of the document code/content

main();
