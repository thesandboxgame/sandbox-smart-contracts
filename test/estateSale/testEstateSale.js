const {runCommonTests} = require("./subTests/common_tests");
const {runEtherTests} = require("./subTests/ether_tests");
const {runSandTests} = require("./subTests/sand_tests");
const {runDaiTests} = require("./subTests/dai_tests");

runCommonTests("LandSale_5");
runEtherTests("LandSale_5");
runSandTests("LandSale_5");
runDaiTests("LandSale_5");
