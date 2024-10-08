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
    'solc_0.8.15', //temporary for repo cleaning
    'solc_0.8/asset', //temporary for repo cleaning
    'solc_0.8/assetERC721', //temporary for repo cleaning
    'solc_0.8/assetERC1155', //temporary for repo cleaning
    'solc_0.8/common/BaseWithStorage/ERC721BaseToken.sol', //temporary for repo cleaning
    'solc_0.8/common/BaseWithStorage/ERC20/ERC20BaseTokenUpgradeable.sol', //temporary for repo cleaning
    'solc_0.8/faucet/Faucets.sol', //temporary for repo cleaning
  ],
};
