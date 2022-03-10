//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AssetBaseERC721} from "../../../assetERC721/AssetBaseERC721.sol";
import {IChildToken} from "../../../common/interfaces/@maticnetwork/pos-portal/child/ChildToken/IChildToken.sol";

/// @title This contract is for AssetERC721 which can be minted by a minter role.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract AssetERC721 is AssetBaseERC721, IChildToken {
    /// @notice fulfills the purpose of a constructor in upgradeable contracts
    function initialize(address trustedForwarder, address admin) external {
        initV3(trustedForwarder, admin);
    }

    function deposit(address user, bytes calldata depositData) external override {}

    // TODO: update interface
    function withdraw(uint256 tokenId) external {}

    function withdrawBatch(uint256[] calldata tokenIds) external {}

    function withdrawWithMetadata(uint256 tokenId) external {}

    // TODO: function mint - add require statement
}
