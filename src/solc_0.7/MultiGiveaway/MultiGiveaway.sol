//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../LandGiveaway/LandGiveaway.sol";
import "../AssetGiveaway/AssetGiveaway.sol";

/// @title MultiGiveaway contract
/// @notice This contract manages multiple ERC1155 and ERC721 claims
contract MultiGiveaway is AssetGiveaway, LandGiveaway {
    constructor(
        address asset,
        address land,
        address admin,
        bytes32 merkleRootAsset,
        address assetsHolder,
        bytes32 merkleRootLand,
        address landHolder,
        uint256 expiryTime
    )
        AssetGiveaway(asset, admin, merkleRootAsset, assetsHolder, expiryTime)
        LandGiveaway(land, admin, merkleRootLand, landHolder, expiryTime)
    {}
}
