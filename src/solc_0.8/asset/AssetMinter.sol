//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-0.8/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "../common/BaseWithStorage/ERC2771Handler.sol";
import "../common/interfaces/IAssetMinter.sol";
import "../catalyst/GemsCatalystsRegistry.sol";
import "../common/interfaces/IERC20Extended.sol";
import "../common/interfaces/IAssetToken.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

/// @notice Allow to mint Asset with Catalyst, Gems and Sand, giving the assets attributes through AssetAttributeRegistry
contract AssetMinter is ERC2771Handler, IAssetMinter, WithAdmin, Ownable {
    using SafeMath for uint256;

    uint256 private constant NFT_SUPPLY = 1;

    uint256 public artQuantity = 1;
    uint256 public propQuantity = 10000;
    uint256 public commonQuantity = 1000;
    uint256 public rareQuantity = 100;
    uint256 public epicQuantity = 10;
    uint256 public legendaryQuantity = 1;
    uint32 public numberOfGemsBurnPerAsset = 1;
    uint32 public numberOfCatalystBurnPerAsset = 1;
    uint256 public gemUnitWhenBurning = 1000000000000000000;
    uint256 public catalystUnitWhenBurning = 1000000000000000000;

    IAssetAttributesRegistry internal immutable _registry;
    IAssetToken internal immutable _asset;
    GemsCatalystsRegistry internal immutable _gemsCatalystsRegistry;

    /// @notice AssetMinter depends on
    /// @param registry: AssetAttributesRegistry for recording catalyst and gems used
    /// @param asset: Asset Token Contract (dual ERC1155/ERC721)
    /// @param gemsCatalystsRegistry: that track the canonical catalyst and gems and provide batch burning facility
    /// @param trustedForwarder: address of the trusted forwarder (used for metaTX)
    constructor(
        IAssetAttributesRegistry registry,
        IAssetToken asset,
        GemsCatalystsRegistry gemsCatalystsRegistry,
        address admin,
        address trustedForwarder
    ) {
        _registry = registry;
        _asset = asset;
        _gemsCatalystsRegistry = gemsCatalystsRegistry;
        _admin = admin;
        __ERC2771Handler_initialize(trustedForwarder);
    }

    function setCommonQuantity(uint256 newQuantity) external onlyOwner {
        commonQuantity = newQuantity;
    }

    function setRareQuantity(uint256 newQuantity) external onlyOwner {
        rareQuantity = newQuantity;
    }

    function setEpicQuantity(uint256 newQuantity) external onlyOwner {
        epicQuantity = newQuantity;
    }

    function setLegendaryQuantity(uint256 newQuantity) external onlyOwner {
        legendaryQuantity = newQuantity;
    }

    function setNumberOfGemsBurnPerAsset(uint32 newQuantity) external onlyOwner {
        numberOfGemsBurnPerAsset = newQuantity;
    }

    function setNumberOfCatalystBurnPerAsset(uint32 newQuantity) external onlyOwner {
        numberOfCatalystBurnPerAsset = newQuantity;
    }

    function setArtQuantity(uint256 newQuantity) external onlyOwner {
        artQuantity = newQuantity;
    }

    function setPropQuantity(uint256 newQuantity) external onlyOwner {
        propQuantity = newQuantity;
    }

    function setGemUnitWhenBurning(uint256 newQuantity) external onlyOwner {
        gemUnitWhenBurning = newQuantity;
    }

    function setCatalystUnitWhenBurning(uint256 newQuantity) external onlyOwner {
        catalystUnitWhenBurning = newQuantity;
    }

    /// @notice mint "quantity" number of Asset token using one catalyst.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param catalystId Id of the Catalyst ERC20 token to burn (1, 2, 3 or 4).
    /// @param gemIds list of gem ids to burn in the catalyst.
    /// @param quantity number of token to mint
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    /// @return assetId The new token Id.
    function mintCustomNumberWithCatalyst(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity,
        address to,
        bytes calldata data
    ) external override onlyAdmin returns (uint256 assetId) {
        _mintRequierements(from, catalystId, quantity, to);
        assetId = _burnAndMint(from, packId, metadataHash, catalystId, gemIds, quantity, to, data);
    }

    /// @notice mint one Asset token with no catalyst.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param to destination address receiving the minted tokens.
    /// @param typeAsset (art or prop) decide how many asset will be minted
    /// @param data extra data.
    /// @return assetId The new token Id.
    function mintWithoutCatalyst(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        address to,
        AssetTypeNoTier typeAsset,
        bytes calldata data
    ) external override returns (uint256 assetId) {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(_msgSender() == from, "AUTH_ACCESS_DENIED");

        uint256 quantity;
        if (typeAsset == AssetTypeNoTier.art) {
            quantity = artQuantity;
        } else if (typeAsset == AssetTypeNoTier.prop) {
            quantity = propQuantity;
        }
        return _asset.mint(from, packId, metadataHash, quantity, 0, to, data);
    }

    /// @notice mint multiple Asset tokens using one catalyst.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param catalystId Id of the Catalyst ERC20 token to burn (1, 2, 3 or 4).
    /// @param gemIds list of gem ids to burn in the catalyst.
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    /// @return assetId The new token Id.
    function mintWithCatalyst(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint16 catalystId,
        uint16[] calldata gemIds,
        address to,
        bytes calldata data
    ) external override returns (uint256 assetId) {
        uint256 quantity = _getQuantityByCatalystId(catalystId);

        _mintRequierements(from, catalystId, quantity, to);
        assetId = _burnAndMint(from, packId, metadataHash, catalystId, gemIds, quantity, to, data);
    }

    /// @notice mint multiple Asset tokens.
    /// @param data contains (-from address creating the Asset, need to be the tx sender or meta tx signer
    /// -packId unused packId that will let you predict the resulting tokenId
    /// -metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata)
    /// @param assets data (gems and catalyst data)
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    function mintMultipleWithCatalyst(
        MintMultipleData memory mintData,
        AssetData[] memory assets,
        address to,
        bytes memory data
    ) public override returns (uint256[] memory assetIds) {
        require(assets.length != 0, "INVALID_0_ASSETS");
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");

        require(_msgSender() == mintData.from, "AUTH_ACCESS_DENIED");

        uint256[] memory supplies = _handleMultipleAssetRequirements(mintData.from, assets);
        assetIds = _asset.mintMultiple(mintData.from, mintData.packId, mintData.metadataHash, supplies, "", to, data);
        for (uint256 i = 0; i < assetIds.length; i++) {
            require(assets[i].catalystId != 0, "AssetMinter: catalystID can't be 0");
            _registry.setCatalyst(assetIds[i], assets[i].catalystId, assets[i].gemIds);
        }
        return assetIds;
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Handler for dealing with assets when minting multiple at once.
    /// @param from The original address that signed the transaction.
    /// @param assets An array of AssetData structs to define how the total gems and catalysts are to be allocated.
    /// @return supplies An array of the quantities for each asset being minted.
    function _handleMultipleAssetRequirements(address from, AssetData[] memory assets)
        internal
        returns (uint256[] memory supplies)
    {
        supplies = new uint256[](assets.length);
        uint256[] memory catalystsToBurn = new uint256[](_gemsCatalystsRegistry.getNumberOfCatalystContract());
        uint256[] memory gemsToBurn = new uint256[](_gemsCatalystsRegistry.getNumberOfGemsContract());

        for (uint256 i = 0; i < assets.length; i++) {
            require(
                assets[i].catalystId > 0 && assets[i].catalystId <= catalystsToBurn.length,
                "AssetMinter: catalystID out of bound"
            );
            catalystsToBurn[assets[i].catalystId - 1]++;
            for (uint256 j = 0; j < assets[i].gemIds.length; j++) {
                require(
                    assets[i].gemIds[j] > 0 && assets[i].gemIds[j] <= gemsToBurn.length,
                    "AssetMinter: gemId out of bound"
                );
                gemsToBurn[assets[i].gemIds[j] - 1]++;
            }

            uint16 maxGems = _gemsCatalystsRegistry.getMaxGems(assets[i].catalystId);
            require(assets[i].gemIds.length <= maxGems, "AssetMinter: too many gems");
            supplies[i] = _getQuantityByCatalystId(assets[i].catalystId);
        }
        _batchBurnCatalysts(from, catalystsToBurn);
        _batchBurnGems(from, gemsToBurn);
    }

    /// @dev Burn a batch of catalysts in one tx.
    /// @param from The original address that signed the tx.
    /// @param catalystsQuantities An array of quantities for each type of catalyst to burn.
    function _batchBurnCatalysts(address from, uint256[] memory catalystsQuantities) internal {
        uint16[] memory ids = new uint16[](catalystsQuantities.length);
        for (uint16 i = 0; i < ids.length; i++) {
            ids[i] = i + 1;
        }
        _gemsCatalystsRegistry.batchBurnCatalysts(from, ids, _scaleCatalystQuantities(catalystsQuantities));
    }

    /// @dev Burn a batch of gems in one tx.
    /// @param from The original address that signed the tx.
    /// @param gemsQuantities An array of quantities for each type of gems to burn.
    function _batchBurnGems(address from, uint256[] memory gemsQuantities) internal {
        uint16[] memory ids = new uint16[](gemsQuantities.length);
        for (uint16 i = 0; i < ids.length; i++) {
            ids[i] = i + 1;
        }
        _gemsCatalystsRegistry.batchBurnGems(from, ids, _scaleGemQuantities(gemsQuantities));
    }

    /// @dev Burn an array of gems.
    /// @param from The original signer of the tx.
    /// @param gemIds The array of gems to burn.
    /// @param numTimes Amount of gems to burn.
    function _burnGems(
        address from,
        uint16[] memory gemIds,
        uint32 numTimes
    ) internal {
        _gemsCatalystsRegistry.burnDifferentGems(from, gemIds, numTimes * gemUnitWhenBurning);
    }

    /// @dev Burn a single type of catalyst.
    /// @param from The original signer of the tx.
    /// @param catalystId The type of catalyst to burn.
    /// @param numTimes Amount of catalysts of this type to burn.
    function _burnCatalyst(
        address from,
        uint16 catalystId,
        uint32 numTimes
    ) internal {
        _gemsCatalystsRegistry.burnCatalyst(from, catalystId, numTimes * catalystUnitWhenBurning);
    }

    /// @dev Scale up each number in an array of quantities by a factor of gemsUnits.
    /// @param quantities The array of numbers to scale.
    /// @return scaledQuantities The scaled-up values.
    function _scaleGemQuantities(uint256[] memory quantities)
        internal
        view
        returns (uint256[] memory scaledQuantities)
    {
        scaledQuantities = new uint256[](quantities.length);
        for (uint256 i = 0; i < quantities.length; i++) {
            scaledQuantities[i] = quantities[i] * gemUnitWhenBurning * numberOfGemsBurnPerAsset;
        }
    }

    /// @dev Scale up each number in an array of quantities by a factor of gemsUnits.
    /// @param quantities The array of numbers to scale.
    /// @return scaledQuantities The scaled-up values.
    function _scaleCatalystQuantities(uint256[] memory quantities)
        internal
        view
        returns (uint256[] memory scaledQuantities)
    {
        scaledQuantities = new uint256[](quantities.length);
        for (uint256 i = 0; i < quantities.length; i++) {
            scaledQuantities[i] = quantities[i] * catalystUnitWhenBurning * numberOfCatalystBurnPerAsset;
        }
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function _getQuantityByCatalystId(uint16 catalystId) internal view returns (uint256 quantity) {
        quantity = 0;
        if (catalystId == 1) {
            // common
            quantity = commonQuantity;
        } else if (catalystId == 2) {
            // rare
            quantity = rareQuantity;
        } else if (catalystId == 3) {
            // epic
            quantity = epicQuantity;
        } else if (catalystId == 4) {
            // legendary
            quantity = legendaryQuantity;
        }
    }

    function _mintRequierements(
        address from,
        uint16 catalystId,
        uint256 quantity,
        address to
    ) internal view {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(_msgSender() == from, "AUTH_ACCESS_DENIED");
        require(catalystId != 0, "AssetMinter: catalystId cannot be 0");
        require(quantity != 0, "AssetMinter: quantity cannot be 0");
    }

    function _burnAndMint(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity,
        address to,
        bytes calldata data
    ) internal returns (uint256 assetId) {
        _burnCatalyst(from, catalystId, numberOfCatalystBurnPerAsset);
        _burnGems(from, gemIds, numberOfGemsBurnPerAsset);

        assetId = _asset.mint(from, packId, metadataHash, quantity, 0, to, data);
        _registry.setCatalyst(assetId, catalystId, gemIds);
    }
}
