pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./interfaces/IStarterPack.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract StarterPack is IStarterPack, Admin {
    // /////////////////////////// Data ///////////////////////////
    mapping(address => uint256) creatorNonce;

    // //////////////////////////Functions ////////////////////////
    function purchase(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external override payable {
        // Sanity check:
        creatorNonce[to]++;
    }

    function withdrawAll(address to) external override onlyAdmin {}

    function setPrices(uint256[4] calldata prices) external override onlyAdmin {}
}
