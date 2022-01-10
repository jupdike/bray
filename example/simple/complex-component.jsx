function helper(x) {
  return x + ' Appended';
}
const ComplexComponent = (props) => <italic attr={helper("Sample Text")}>Something</italic>
