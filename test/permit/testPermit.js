const {setupPermit} = require("./fixtures");

describe("Permit", function () {
  it("Permit contract exists", async function () {
    const {permitContract} = await setupPermit();
    console.log(permitContract);
  });
});
