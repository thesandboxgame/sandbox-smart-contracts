const {runCommonTests} = require("../estateSale/subTests/common_tests");
const {runSandTests} = require("../estateSale/subTests/sand_tests");

for (let sector = 11; sector <= 14; sector++) {
  const landSaleName = "LandPreSale_4_2_" + sector;
  runCommonTests(landSaleName);
  runSandTests(landSaleName);
}
