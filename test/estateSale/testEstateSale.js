const {runCommonTests} = require("./subTests/common_tests");
const {runEtherTests} = require("./subTests/ether_tests");
const {runSandTests} = require("./subTests/sand_tests");
const {runDaiTests} = require("./subTests/dai_tests");

runCommonTests("LandPreSale_5");
runEtherTests("LandPreSale_5");
runSandTests("LandPreSale_5");
runDaiTests("LandPreSale_5");
