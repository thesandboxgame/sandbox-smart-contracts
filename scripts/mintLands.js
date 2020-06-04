const {isAddress} = require("@ethersproject/address");
const args = process.argv.slice(2);

async function mint(x, y, size, address) {
  console.log("------------------------------------------------");
  console.log("mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes calldata data)");
  console.log("to:");
  console.log(address);
  console.log("size:");
  console.log(size);
  console.log("x:");
  console.log(x);
  console.log("y:");
  console.log(y);
  console.log("data:");
  console.log("0x");
}

(async () => {
  if (args.length !== 4) {
    console.error(`mintLand.js <x> <y> <size> <to>`);
  } else if (!isAddress(args[3])) {
    console.error(`invalid address for "to" : ${args[3]}`);
  } else if (!isAddress(args[3])) {
    console.error(`invalid address for "to" : ${args[3]}`);
  } else {
    const x = parseInt(args[0], 10) + 204;
    const y = parseInt(args[1], 10) + 204;
    const size = parseInt(args[2], 10);
    if (isNaN(x) || isNaN(y) || isNaN(size)) {
      console.error(`invalid numbers ${x}, ${y}, ${size}`);
    } else if (x % size !== 0) {
      console.error(`x (${x}) is not divisble by size (${size})`);
    } else if (y % size !== 0) {
      console.error(`y (${y}) is not divisble by size (${size})`);
    } else {
      mint(x, y, size, args[3]);
    }
  }
})();
