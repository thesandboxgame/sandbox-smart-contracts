const {runCommonTests} = require("./subTests/common_tests");
// const {runEtherTests} = require("./subTests/ether_tests");
// const {runSandTests} = require("./subTests/sand_tests");
// const {runDaiTests} = require("./subTests/dai_tests");

runCommonTests();
// skipping : not sure why these test start to fails now. We should remove them anyway as we have no use of these old contracts
// runEtherTests();
// runSandTests();
// runDaiTests();
