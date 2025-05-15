// Tree data structure
class Tree {
  constructor(value, children = []) {
    this.value = value;
    this.children = children;
  }
}

// Converts a list of {level, text} objects to a list of Tree nodes
function pairListToTreeList(pairs, cons = (x, y) => new Tree(x, y)) {
  if (pairs.length === 0) return [];

  const [{ level, text }, ...rest] = pairs;
  const kids = [];
  let i = 0;

  // Find all children (where level > current level)
  while (i < rest.length && rest[i].level > level) {
    kids.push(rest[i]);
    i++;
  }

  const sibs = rest.slice(i);

  return [
    cons(text, pairListToTreeList(kids, cons)),
    ...pairListToTreeList(sibs, cons)
  ];
}

// Example usage:
const input = [
  { level: 1, text: 'a' },
  { level: 2, text: 'b' },
  { level: 3, text: 'c' },
  { level: 1, text: 'd' }
];

console.log(pairListToTreeList(input));

let str = pairListToTreeList(input,
        function(x, y) {
          return `<ul>\n<li>${x}</li>\n${y.join('\n')}</ul>`
        }
    ).join('');
console.log(str);
