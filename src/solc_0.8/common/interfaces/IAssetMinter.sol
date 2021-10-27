//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
pragma experimental ABIEncoderV2;

interface IAssetMinter {
    struct AssetData {
        uint16[] gemIds;
        uint16 catalystId;
    }

    // use only to fix stack too deep
    struct MintData {
        address from;
        address to;
        uint40 packId;
        bytes32 metadataHash;
        bytes data;
    }

    function mintWithoutCatalyst(MintData calldata mintData, uint16 typeAsset1Based) external returns (uint256 assetId);

    function mintWithCatalyst(
        MintData calldata mintData,
        uint16 catalystId,
        uint16[] calldata gemIds
    ) external returns (uint256 assetId);

    function mintMultipleWithCatalyst(MintData calldata mintData, AssetData[] memory assets)
        external
        returns (uint256[] memory assetIds);

    function mintCustomNumberWithCatalyst(
        MintData calldata mintData,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity
    ) external returns (uint256 assetId);

    function addOrReplaceQuantitiyByCatalystId(uint16 catalystId, uint256 newQuantity) external;

    function addOrReplaceAssetTypeQuantity(uint16 index1Based, uint256 newQuantity) external;

    function setNumberOfGemsBurnPerAsset(uint32 newQuantity) external;

    function setNumberOfCatalystsBurnPerAsset(uint32 newQuantity) external;

    function setGemsFactor(uint256 newQuantity) external;

    function setCatalystsFactor(uint256 newQuantity) external;

    function setCustomMintingAllowance(address addressToModify, bool isAddressAllowed) external;
}
