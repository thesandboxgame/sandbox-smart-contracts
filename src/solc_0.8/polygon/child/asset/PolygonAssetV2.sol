//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/Address.sol";
import "../../../asset/ERC1155ERC721.sol";
import "../../../catalyst/interfaces/IAssetAttributesRegistry.sol";
import "../../../asset/libraries/AssetHelper.sol";

// solhint-disable-next-line no-empty-blocks
contract PolygonAssetV2 is ERC1155ERC721 {
    address private _childChainManager;
    AssetHelper.AssetRegistryData private assetRegistryData;

    event ChainExit(address indexed to, uint256[] tokenIds, uint256[] amounts, bytes data);

    /// @notice fulfills the purpose of a constructor in upgradeabale contracts
    function initialize(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        address childChainManager,
        uint8 chainIndex,
        address assetRegistry
    ) external {
        initV2(trustedForwarder, admin, bouncerAdmin, address(0), chainIndex);
        _childChainManager = childChainManager;
        assetRegistryData.assetRegistry = IAssetAttributesRegistry(assetRegistry);
    }

    /// @notice called when tokens are deposited on root chain
    /// @dev Should be callable only by ChildChainManager
    /// @dev Should handle deposit by minting the required tokens for user
    /// @dev Make sure minting is done only by this function
    /// @param user user address for whom deposit is being done
    /// @param depositData abi encoded ids array and amounts array
    function deposit(address user, bytes calldata depositData) external {
        require(_msgSender() == _childChainManager, "!DEPOSITOR");
        require(user != address(0), "INVALID_DEPOSIT_USER");
        (uint256[] memory ids, uint256[] memory amounts, bytes32[] memory hashes) =
            AssetHelper.decodeAndSetCatalystDataL1toL2(assetRegistryData, depositData);
        for (uint256 i = 0; i < ids.length; i++) {
            _metadataHash[ids[i] & ERC1155ERC721Helper.URI_ID] = hashes[i];
            _rarityPacks[ids[i] & ERC1155ERC721Helper.URI_ID] = "0x00";
            uint16 numNFTs = 0;
            if ((ids[i] & ERC1155ERC721Helper.IS_NFT) > 0) {
                numNFTs = 1;
            }

            uint256[] memory singleId = new uint256[](1);
            singleId[0] = ids[i];
            uint256[] memory singleAmount = new uint256[](1);
            singleAmount[0] = amounts[i];
            _mintBatches(singleAmount, user, singleId, numNFTs);
        }
    }

    /// @notice called when user wants to withdraw tokens back to root chain
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
    /// @param ids ids to withdraw
    /// @param amounts amounts to withdraw
    function withdraw(uint256[] calldata ids, uint256[] calldata amounts) external {
        bytes32[] memory hashes = new bytes32[](ids.length);
        IAssetAttributesRegistry.AssetGemsCatalystData[] memory gemsCatalystDatas =
            AssetHelper.getGemsAndCatalystData(assetRegistryData, ids);

        for (uint256 i = 0; i < ids.length; i++) {
            hashes[i] = _metadataHash[ids[i] & ERC1155ERC721Helper.URI_ID];
        }

        if (ids.length == 1) {
            _burn(_msgSender(), ids[0], amounts[0]);
        } else {
            _burnBatch(_msgSender(), ids, amounts);
        }
        emit ChainExit(_msgSender(), ids, amounts, abi.encode(hashes, gemsCatalystDatas));
    }
}
