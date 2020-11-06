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
    mapping(uint256 => bool) _migratedNFT;

    constructor(AssetToken asset, AssetAttributesRegistry registry, OldCatalystRegistry oldRegistry, bytes32 merkleRoot) {
        _oldRegistry = oldRegistry;
        _asset = asset;
        _registry = registry;
        _merkleRoot = merkleRoot;
    }

    function migrate(address from, address to, uint256 assetId, uint256 amount, uint16[] calldata gems) external {
        // TODO metatx
        require(msg.sender == from, "NOT_AUTHORIZED");
        uint256 balance = _asset.balanceOf(from, assetId);
        require(balance >= amount, "NOT_ENOUGH");
        (bool exists, uint256 catalystId) = _oldRegistry.getCatalyst(assetId);
        require(exists, "CATALYST_NOT_EXIST");

        catalystId += 1; // old catalyst were zero , new one start with common = 1

        // TODO check gems as merkle tree against collection ID

        if (amount == 1 && assetId & IS_NFT != 0) {
            require(!_migratedNFT[assetId], "ALREADY_MIGRATED");
            _registry.setCatalyst(assetId, uint16(catalystId), gems); // TODO blockNumber override to ensure same result
            _migratedNFT[assetId] = true;
        } else {
            for (uint256 i = 0; i < amount; i++) {
                // TODO if not nft
                uint256 tokenId = _asset.extractERC721From(from, assetId, to);
                _registry.setCatalyst(tokenId, uint16(catalystId), gems); // TODO blockNumber override to ensure same result
                _migratedNFT[tokenId] = true;
            }
        }
    }

}
