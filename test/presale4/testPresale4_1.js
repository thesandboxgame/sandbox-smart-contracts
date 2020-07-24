const {runCommonTests} = require("../estateSale/subTests/common_tests");
const {runEtherTests} = require("../estateSale/subTests/ether_tests");
const {runSandTests} = require("../estateSale/subTests/sand_tests");
const {runDaiTests} = require("../estateSale/subTests/dai_tests");

runCommonTests("LandPreSale_4_1");
runEtherTests("LandPreSale_4_1");
runSandTests("LandPreSale_4_1");
runDaiTests("LandPreSale_4_1");
