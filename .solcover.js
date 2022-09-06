module.exports = {
  mocha: {
    grep: '@skip-on-coverage', // Find everything with this tag
    invert: true, // Run the grep's inverse set.
  },
  skipFiles: [
    'solc_0.8/test',
    'solc_0.8/defi/ERC20RewardPool.sol', // legacy file
    'solc_0.8/defi/rewardCalculation/TwoPeriodsRewardCalculator.sol', // legacy file
    'solc_0.8/common/BaseWithStorage/ERC2771HandlerV2.sol', // legacy file
    'solc_0.8/defi/rules', // legacy files
    'solc_0.8/polygon/child/asset/MockPolygonAssetERC1155Tunnel.sol', // mock
    'solc_0.5',
    'solc_0.6',
    'solc_0.7',
  ],
};
