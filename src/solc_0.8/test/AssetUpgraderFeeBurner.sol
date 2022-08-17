//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../asset/AssetUpgrader.sol";

/// @notice Allow to upgrade Asset with Catalyst, Gems and Sand, giving the assets attributes through AssetAttributeRegistry
contract AssetUpgraderFeeBurner is AssetUpgrader {
    constructor(
        IAssetAttributesRegistry registry,
        IERC20Extended sand,
        IPolygonAssetERC721 assetERC721,
        IPolygonAssetERC1155 assetERC1155,
        GemsCatalystsRegistry gemsCatalystsRegistry,
        uint256 _upgradeFee,
        uint256 _gemAdditionFee,
        address _feeRecipient,
        address trustedForwarder
    )
        AssetUpgrader(
            registry,
            sand,
            assetERC721,
            assetERC1155,
            gemsCatalystsRegistry,
            _upgradeFee,
            _gemAdditionFee,
            _feeRecipient,
            trustedForwarder
        )
    // solhint-disable-next-line no-empty-blocks
    {

    }
}
