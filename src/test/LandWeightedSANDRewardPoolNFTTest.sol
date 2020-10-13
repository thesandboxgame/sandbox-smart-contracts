pragma solidity 0.6.5;

import "../LiquidityMining/LandWeightedSANDRewardPool.sol";


contract LandWeightedSANDRewardPoolNFTTest is LandWeightedSANDRewardPool {
    constructor(
        address stakeTokenContract,
        address rewardTokenContract,
        address nftContract,
        uint256 nftFactor6,
        uint256 nftConstant6
    ) public LandWeightedSANDRewardPool(IERC20(stakeTokenContract), IERC20(rewardTokenContract), ERC721(nftContract), nftFactor6, nftConstant6) {}
}
