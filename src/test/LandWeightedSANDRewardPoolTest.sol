pragma solidity 0.6.5;

import "../LiquidityMining/LandWeightedSANDRewardPool.sol";


contract LandWeightedSANDRewardPoolTest is LandWeightedSANDRewardPool {
    constructor(uint256 nftFactor6, uint256 nftConstant6)
        public
        LandWeightedSANDRewardPool(IERC20(address(0)), IERC20(address(0)), ERC721(address(0)), nftFactor6, nftConstant6)
    {}

    function testComputeContribution(uint256 amountStaked, uint256 numLands) external view returns (uint256) {
        return computeContribution(amountStaked, numLands);
    }
}
