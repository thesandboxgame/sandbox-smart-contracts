//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "./interfaces/OldCatalystRegistry.sol";
import "./AssetAttributesRegistry.sol";
import "../common/Interfaces/IAssetToken.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

/// @notice Contract performing migrations for collections, do not require owner approval
contract CollectionCatalystMigrations is WithAdmin {
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;

    OldCatalystRegistry internal immutable _oldRegistry;
    AssetAttributesRegistry internal immutable _registry;
    IAssetToken internal immutable _asset;

    struct Migration {
        uint256 assetId;
        uint16[] gemIds;
        uint64 blockNumber;
    }

    /// @notice CollectionCatalystMigrations depends on:
    /// @param asset: Asset Token Contract
    /// @param registry: New AssetAttributesRegistry
    /// @param oldRegistry: Old CatalystRegistry
    constructor(
        IAssetToken asset,
        AssetAttributesRegistry registry,
        OldCatalystRegistry oldRegistry,
        address admin
    ) {
        _oldRegistry = oldRegistry;
        _asset = asset;
        _registry = registry;
        _admin = admin;
    }

    function migrate(
        uint256 assetId,
        uint16[] calldata gemIds,
        uint64 blockNumber
    ) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        _migrate(assetId, gemIds, blockNumber);
    }

    function batchMigrate(Migration[] calldata migrations) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        for (uint256 i = 0; i < migrations.length; i++) {
            _migrate(migrations[i].assetId, migrations[i].gemIds, migrations[i].blockNumber);
        }
    }

    function _migrate(
        uint256 assetId,
        uint16[] memory gemIds,
        uint64 blockNumber
    ) internal {
        (bool oldExists, uint256 catalystId) = _oldRegistry.getCatalyst(assetId);
        require(oldExists, "OLD_CATALYST_NOT_EXIST");
        (bool exists, , ) = _registry.getRecord(assetId);
        require(!exists, "ALREADY_MIGRATED");

        catalystId += 1; // old catalyst were zero , new one start with common = 1
        if (assetId & IS_NFT != 0) {
            // ensure this NFT has no collection: original NFT
            // If it has, the collection itself need to be migrated
            try _asset.collectionOf(assetId) returns (uint256 collId) {
                require(collId == 0, "NOT_ORIGINAL_NFT");
                // solhint-disable-next-line no-empty-blocks
            } catch {}
        }
        _registry.setCatalystWithBlockNumber(assetId, uint16(catalystId), gemIds, blockNumber);
    }
}
