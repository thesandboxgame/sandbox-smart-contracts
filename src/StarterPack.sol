pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./interfaces/IStarterPack.sol";


contract StarterPack is IStarterPack {
    function purchase(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external override payable {}

    function withdrawAll(address to) external override {}

    function setPrices(uint256[4] calldata prices) external override {}
}
