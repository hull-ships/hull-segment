var foo = {};
var o = { a: "foo" };

const { a } = o;
var b = o.a;

if (a===b) {
  // console.log(foo)
}

function d(b, c) {
  b = 12;
  return b;
}
