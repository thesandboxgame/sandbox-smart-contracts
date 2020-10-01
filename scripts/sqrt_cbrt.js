const fs = require("fs");
const stringify = require("csv-stringify/lib/sync");

function sqrtLoss(a) {
  let tmp = Math.floor((a + 1) / 2);
  let c = a;
  while (tmp < c) {
    c = tmp;
    tmp = Math.floor((Math.floor(a / tmp) + tmp) / 2);
  }
  return c;
}

function sqrt(a) {
  a = a * 1000000;
  let tmp = Math.floor((a + 1) / 2);
  let c = a;
  while (tmp < c) {
    c = tmp;
    tmp = Math.floor((Math.floor(a / tmp) + tmp) / 2);
  }
  return c / 1000;
}

// for (const num of [2, 3, 9, 10, 122, 10000]) {
//   console.log(sqrt(num));
// }

function cbrtLoss(a) {
  let tmp = Math.floor((a + 2) / 3);
  let c = a;
  while (tmp < c) {
    c = tmp;
    tmp = Math.floor((Math.floor(a / Math.pow(tmp, 2)) + 2 * tmp) / 3);
  }
  return c;
}

function cbrt(a) {
  a = a * 1000000;
  let tmp = Math.floor((a + 2) / 3);
  let c = a;
  while (tmp < c) {
    c = tmp;
    tmp = Math.floor((Math.floor(a / Math.pow(tmp, 2)) + 2 * tmp) / 3);
  }
  return c / 100;
}

// for (const num of [2, 3, 9, 10, 122, 10000]) {
//   console.log(cbrt(num));
// }

const m = 0.1;
function f(x) {
  return x === 0 ? 0 : 9 + cbrt(x);
}

const values = [["1 LP Token"], ["1000 LP Token"]];
const columns = [{key: "NumLands", header: "NumLands"}];
for (const num of [0, 1, 3, 9, 10, 122, 10000]) {
  columns.push({key: "" + num, header: num});
  values[0].push(1 + 1 * m * f(num));
  values[1].push(1000 + 1000 * m * f(num));
}

const result = stringify(values, {
  columns,
  header: true,
});
fs.writeFileSync("sqrt_cbrt.csv", result);
