//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "./interfaces/OldCatalystRegistry.sol";
import "./AssetAttributesRegistry.sol";
import "../common/Interfaces/AssetToken.sol";

contract CatalystMigrations {
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;

    OldCatalystRegistry internal immutable _oldRegistry;
    AssetAttributesRegistry internal immutable _registry;
    AssetToken internal immutable _asset;
    bytes32 immutable _merkleRoot;

    // mapping(uint256 => bool) _migratedNFT;

    constructor(
        AssetToken asset,
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
            // require(!_migratedNFT[assetId], "ALREADY_MIGRATED");
            (bool exists, , ) = _registry.getRecord(assetId);
            require(!exists, "ALREADY_MIGRATED");

            uint256 collectionId = assetId;
            try _asset.collectionOf(assetId) returns (uint256 collId) {
                // Need try/catch as collectionof throw on asset minted as NFT (initial supply = 1)
                collectionId = collId;
            } catch {}
            require(_verify(proof, collectionId, gemIds), "INVALID_PROOF");
            _registry.setCatalyst(assetId, uint16(catalystId), gemIds); // TODO blockNumber override to ensure same result
            // _migratedNFT[assetId] = true;
        } else {
            require(_verify(proof, assetId, gemIds), "INVALID_PROOF");
            for (uint256 i = 0; i < amount; i++) {
                // TODO if not nft
                uint256 tokenId = _asset.extractERC721From(from, assetId, to);
                _registry.setCatalyst(tokenId, uint16(catalystId), gemIds); // TODO blockNumber override to ensure same result
                // _migratedNFT[tokenId] = true;
            }
        }
    }

    function _verify(
        bytes32[] memory proof,
        uint256 collectionId,
        uint16[] memory gemIds
    ) internal view returns (bool) {
        bytes32 computedHash = keccak256(abi.encodePacked(collectionId, gemIds));

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
