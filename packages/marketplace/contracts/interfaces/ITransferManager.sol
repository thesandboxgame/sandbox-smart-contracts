// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibAsset} from "../libraries/LibAsset.sol";

abstract contract ITransferManager {
    /// @notice struct used to call doTransfer and transfer asset between accounts
    struct DealSide {
        LibAsset.AssetClass class; // type of asset
        address tokenAddress; // token address for the asset
        uint256 tokenId; // depending on class this may be the token id or zero for ERC20
        address account; // account that will get the tokens
        uint256 value; // amount to transfer
    }

    /// @notice executes transfers for 2 matched orders
    /// @param left DealSide from the left order (see LibDeal.sol)
    /// @param right DealSide from the right order (see LibDeal.sol)
    /// @dev this is the main entry point, when used as a separated contract this method will be external
    function doTransfers(DealSide memory left, DealSide memory right) internal virtual;
}
