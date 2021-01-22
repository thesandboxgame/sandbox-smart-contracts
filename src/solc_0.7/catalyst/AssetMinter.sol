//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./AssetAttributesRegistry.sol";
import "./GemsCatalystsRegistry.sol";
import "../common/Interfaces/ERC20Extended.sol";
import "../common/Interfaces/AssetToken.sol";
import "../common/BaseWithStorage/WithMetaTransaction.sol";

/// @notice Allow to upgrade Asset with Catalyst, Gems and Sand, giving the assets attributes through AssetAttributeRegistry
contract AssetMinter is WithMetaTransaction {
    using SafeMath for uint256;

    uint256 private constant GEM_UNIT = 1000000000000000000;
    uint256 private constant CATALYST_UNIT = 1000000000000000000;

    AssetAttributesRegistry internal immutable _registry;
    AssetToken internal immutable _asset;
    GemsCatalystsRegistry internal immutable _gemsCatalystsRegistry;

    struct AssetData {
        uint16[] gemIds;
        uint32 quantity;
        uint16 catalystId;
    }

    /// @notice AssetMinter depends on
    /// @param registry: AssetAttributesRegistry for recording catalyst and gems used
    /// @param asset: Asset Token Contract (dual ERC1155/ERC721)
    /// @param gemsCatalystsRegistry: that track the canonical catalyst and gems and provide batch burning facility
    constructor(
        AssetAttributesRegistry registry,
        AssetToken asset,
        GemsCatalystsRegistry gemsCatalystsRegistry
    ) {
        _registry = registry;
        _asset = asset;
        _gemsCatalystsRegistry = gemsCatalystsRegistry;
    }

    /// @notice mint one Asset token.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param catalystId address of the Catalyst ERC20 token to burn.
    /// @param gemIds list of gem ids to burn in the catalyst.
    /// @param quantity asset supply to mint
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    function mint(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint32 quantity,
        address to,
        bytes calldata data
    ) external returns (uint256 assetId) {
        _checkAuthorization(from, to);

        assetId = _asset.mint(from, packId, metadataHash, quantity, 0, to, data);
        if (catalystId != 0) {
            _setSingleCatalyst(from, assetId, quantity, catalystId, gemIds);
        }
        return assetId;
    }

    /// @notice mint multiple Asset tokens.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param gemsQuantities quantities of gems to be used for each id in order
    /// @param catalystsQuantities quantities of catalyst to be used for each id in order
    /// @param assets contains the data to associate catalyst and gems to the assets.
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    function mintMultiple(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint256[] memory gemsQuantities,
        uint256[] memory catalystsQuantities,
        AssetData[] memory assets,
        address to,
        bytes memory data
    ) public returns (uint256[] memory assetIds) {
        require(assets.length != 0, "INVALID_0_ASSETS");
        _checkAuthorization(from, to);
        uint256[] memory supplies = _handleMultipleAssetRequirements(from, gemsQuantities, catalystsQuantities, assets);
        assetIds = _asset.mintMultiple(from, packId, metadataHash, supplies, "", to, data);
        for (uint256 i = 0; i < assetIds.length; i++) {
            if (assets[i].catalystId != 0) {
                _registry.setCatalyst(assetIds[i], assets[i].catalystId, assets[i].gemIds);
            }
        }
        return assetIds;
    }

    function _handleMultipleAssetRequirements(
        address from,
        uint256[] memory gemsQuantities,
        uint256[] memory catalystsQuantities,
        AssetData[] memory assets
    ) internal returns (uint256[] memory supplies) {
        _batchBurnCatalysts(from, catalystsQuantities);
        _batchBurnGems(from, gemsQuantities);

        supplies = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i].catalystId != 0) {
                require(catalystsQuantities[assets[i].catalystId] != 0, "INVALID_CATALYST_NOT_ENOUGH");
                uint16 maxGems = _gemsCatalystsRegistry.getMaxGems(assets[i].catalystId);
                require(assets[i].gemIds.length <= maxGems, "INVALID_GEMS_TOO_MANY");
                catalystsQuantities[assets[i].catalystId]--;
                gemsQuantities = _checkGemsQuantities(gemsQuantities, assets[i].gemIds);
            }
            supplies[i] = assets[i].quantity;
        }
    }

    function _checkGemsQuantities(uint256[] memory gemsQuantities, uint16[] memory gemIds)
        internal
        pure
        returns (uint256[] memory)
    {
        for (uint256 i = 0; i < gemIds.length; i++) {
            require(gemsQuantities[gemIds[i]] != 0, "INVALID_GEMS_NOT_ENOUGH");
            gemsQuantities[gemIds[i]]--;
        }
        return gemsQuantities;
    }

    function _batchBurnCatalysts(address from, uint256[] memory catalystsQuantities) internal {
        uint16[] memory ids = new uint16[](catalystsQuantities.length);
        for (uint16 i = 0; i < ids.length; i++) {
            ids[i] = i;
        }
        _gemsCatalystsRegistry.batchBurnCatalysyts(from, ids, catalystsQuantities);
    }

    function _batchBurnGems(address from, uint256[] memory gemsQuantities) internal {
        uint16[] memory ids = new uint16[](gemsQuantities.length);
        for (uint16 i = 0; i < ids.length; i++) {
            ids[i] = i;
        }
        _gemsCatalystsRegistry.batchBurnGems(from, ids, gemsQuantities);
    }

    function _setSingleCatalyst(
        address from,
        uint256 assetId,
        uint32 supply,
        uint16 catalystId,
        uint16[] memory gemIds
    ) internal {
        _burnCatalyst(from, catalystId, supply);
        _burnGems(from, gemIds, supply);

        _registry.setCatalyst(assetId, catalystId, gemIds);
    }

    function _burnGems(
        address from,
        uint16[] memory gemIds,
        uint32 numTimes
    ) internal {
        _gemsCatalystsRegistry.burnDifferentGems(from, gemIds, numTimes * GEM_UNIT);
    }

    function _burnCatalyst(
        address from,
        uint16 catalystId,
        uint32 numTimes
    ) internal {
        _gemsCatalystsRegistry.burnCatalyst(from, catalystId, numTimes * CATALYST_UNIT);
    }

    function _checkAuthorization(address from, address to) internal view {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        if (from != msg.sender) {
            uint256 processorType = _metaTransactionContracts[msg.sender];
            require(processorType != 0, "INVALID SENDER");
            if (processorType == METATX_2771) {
                require(from == _forceMsgSender(), "INVALID_SENDER");
            }
        }
    }
}
