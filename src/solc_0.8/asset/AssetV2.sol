//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "./ERC1155ERC721.sol";
import "../catalyst/interfaces/IAssetAttributesRegistry.sol";
import "./libraries/AssetHelper.sol";

// solhint-disable-next-line no-empty-blocks
contract AssetV2 is ERC1155ERC721 {
    AssetHelper.AssetRegistryData private assetRegistryData;

    /// @notice fulfills the purpose of a constructor in upgradeabale contracts
    function initialize(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        address predicate,
        uint8 chainIndex,
        address assetRegistry
    ) external {
        initV2(trustedForwarder, admin, bouncerAdmin, predicate, chainIndex);
        assetRegistryData.assetRegistry = IAssetAttributesRegistry(assetRegistry);
    }

    /// @notice called by predicate to mint tokens transferred from L2
    /// @param to address to mint to
    /// @param ids ids to mint
    /// @param amounts supply for each token type
    /// @param data extra data to accompany the minting call
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external {
        require(_msgSender() == _predicate, "!PREDICATE");
        bytes32[] memory hashes = AssetHelper.decodeAndSetCatalystDataL2toL1(assetRegistryData, data);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 uriId = ids[i] & ERC1155ERC721Helper.URI_ID;
            _metadataHash[uriId] = hashes[i];
            _rarityPacks[uriId] = "0x00";
            uint16 numNFTs = 0;
            if ((ids[i] & ERC1155ERC721Helper.IS_NFT) > 0) {
                numNFTs = 1;
            }
            uint256[] memory singleId = new uint256[](1);
            singleId[0] = ids[i];
            uint256[] memory singleAmount = new uint256[](1);
            singleAmount[0] = amounts[i];
            _mintBatches(singleAmount, to, singleId, numNFTs);
        }
    }
}
