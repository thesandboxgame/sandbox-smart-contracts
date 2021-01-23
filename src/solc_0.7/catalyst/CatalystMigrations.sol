//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "./interfaces/OldCatalystRegistry.sol";
import "./AssetAttributesRegistry.sol";
import "../common/Interfaces/IAssetToken.sol";

/// @notice Contract allowing owner of asset registered with old registry to get new catalyst/gems
contract CatalystMigrations {
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;

    OldCatalystRegistry internal immutable _oldRegistry;
    AssetAttributesRegistry internal immutable _registry;
    IAssetToken internal immutable _asset;
    bytes32 immutable _merkleRoot;

    /// @notice CatalystMigrations depends on:
    /// @param asset: Asset Token Contract
    /// @param registry: New AssetAttributesRegistry
    /// @param oldRegistry: Old CatalystRegistry
    /// @param merkleRoot: root hash of the merkleTree containing info on gems and blockNumber for each collection
    constructor(
        IAssetToken asset,
        AssetAttributesRegistry registry,
        OldCatalystRegistry oldRegistry,
        bytes32 merkleRoot
    ) {
        _oldRegistry = oldRegistry;
        _asset = asset;
        _registry = registry;
        _merkleRoot = merkleRoot;
    }

    function migrate(
        address from,
        address to,
        uint256 assetId,
        uint256 amount,
        uint16[] calldata gemIds,
        uint64 blockNumber,
        bytes32[] memory proof
    ) external {
        // TODO metatx
        require(msg.sender == from, "NOT_AUTHORIZED");
        uint256 balance = _asset.balanceOf(from, assetId);
        require(balance >= amount, "NOT_ENOUGH");
        (bool oldExists, uint256 catalystId) = _oldRegistry.getCatalyst(assetId);
        require(oldExists, "OLD_CATALYST_NOT_EXIST");

        catalystId += 1; // old catalyst were zero , new one start with common = 1

        if (amount == 1 && assetId & IS_NFT != 0) {
            (bool exists, , ) = _registry.getRecord(assetId);
            require(!exists, "ALREADY_MIGRATED");

            uint256 collectionId = assetId;
            try _asset.collectionOf(assetId) returns (uint256 collId) {
                // Need try/catch as collectionof throw on asset minted as NFT (initial supply = 1)
                collectionId = collId;
            } catch {}
            require(_verify(proof, collectionId, gemIds, blockNumber), "INVALID_PROOF");
            _registry.setCatalystWithBlockNumber(assetId, uint16(catalystId), gemIds, blockNumber);
        } else {
            require(_verify(proof, assetId, gemIds, blockNumber), "INVALID_PROOF");
            for (uint256 i = 0; i < amount; i++) {
                uint256 tokenId = _asset.extractERC721From(from, assetId, to);
                _registry.setCatalystWithBlockNumber(tokenId, uint16(catalystId), gemIds, blockNumber);
            }
        }
    }

    function _verify(
        bytes32[] memory proof,
        uint256 collectionId,
        uint16[] memory gemIds,
        uint64 blockNumber
    ) internal view returns (bool) {
        bytes32 computedHash = keccak256(abi.encodePacked(collectionId, gemIds, blockNumber));

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRoot;
    }
}
