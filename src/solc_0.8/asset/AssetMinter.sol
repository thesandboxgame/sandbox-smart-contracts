//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "../common/BaseWithStorage/ERC2771Handler.sol";
import "../common/interfaces/IAssetMinter.sol";
import "../catalyst/GemsCatalystsRegistry.sol";
import "../common/interfaces/IPolygonAssetERC1155.sol";

/// @notice Allow to mint Asset with Catalyst, Gems and Sand, giving the assets attributes through AssetAttributeRegistry
contract AssetMinter is ERC2771Handler, IAssetMinter, Ownable {
    uint32 public numberOfGemsBurnPerAsset = 1;
    uint32 public numberOfCatalystBurnPerAsset = 1;

    IAssetAttributesRegistry internal immutable _registry;
    IPolygonAssetERC1155 internal immutable _assetERC1155;
    GemsCatalystsRegistry internal immutable _gemsCatalystsRegistry;

    mapping(uint16 => uint256) public quantitiesByCatalystId;
    mapping(uint16 => uint256) public quantitiesByAssetTypeId; // quantities for asset that don't use catalyst to burn (art, prop...)
    mapping(address => bool) public customMinterAllowance;

    event CustomMintingAllowanceChanged(address indexed addressModified, bool indexed isAddressCustomMintingAllowed);
    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event QuantitiesByCatalystIdChanged(uint256 indexed id, uint256 indexed newValue);
    event QuantitiesByAssetTypeIdChanged(uint256 indexed index, uint256 indexed newValue);
    event NumberOfGemsBurnPerAssetChanged(uint256 indexed newValue);
    event NumberOfCatalystBurnPerAssetChanged(uint256 indexed newValue);

    /// @notice AssetMinter depends on
    /// @param registry: AssetAttributesRegistry for recording catalyst and gems used
    /// @param assetERC1155: Asset ERC1155 Token Contract
    /// @param gemsCatalystsRegistry: that track the canonical catalyst and gems and provide batch burning facility
    /// @param trustedForwarder: address of the trusted forwarder (used for metaTX)
    constructor(
        IAssetAttributesRegistry registry,
        IPolygonAssetERC1155 assetERC1155,
        GemsCatalystsRegistry gemsCatalystsRegistry,
        address admin,
        address trustedForwarder,
        uint256[] memory quantitiesByCatalystId_,
        uint256[] memory quantitiesByAssetTypeId_
    ) {
        require(address(registry) != address(0), "AssetMinter: registry can't be zero");
        require(address(assetERC1155) != address(0), "AssetMinter: assetERC1155 can't be zero");
        require(address(gemsCatalystsRegistry) != address(0), "AssetMinter: gemsCatalystsRegistry can't be zero");
        _registry = registry;
        _assetERC1155 = assetERC1155;
        _gemsCatalystsRegistry = gemsCatalystsRegistry;
        transferOwnership(admin);
        __ERC2771Handler_initialize(trustedForwarder);

        require(quantitiesByCatalystId_.length > 0, "AssetMinter: quantitiesByCatalystID length cannot be 0");
        require(quantitiesByAssetTypeId_.length > 0, "AssetMinter: quantitiesByAssetTypeId length cannot be 0");

        for (uint16 i = 0; i < quantitiesByCatalystId_.length; i++) {
            quantitiesByCatalystId[i + 1] = quantitiesByCatalystId_[i];
        }

        for (uint16 i = 0; i < quantitiesByAssetTypeId_.length; i++) {
            quantitiesByAssetTypeId[i + 1] = quantitiesByAssetTypeId_[i];
        }
    }

    function addOrReplaceQuantityByCatalystId(uint16 catalystId, uint256 newQuantity) external override onlyOwner {
        quantitiesByCatalystId[catalystId] = newQuantity;
        emit QuantitiesByCatalystIdChanged(catalystId, newQuantity);
    }

    function addOrReplaceAssetTypeQuantity(uint16 index1Based, uint256 newQuantity) external override onlyOwner {
        quantitiesByAssetTypeId[index1Based] = newQuantity;
        emit QuantitiesByAssetTypeIdChanged(index1Based, newQuantity);
    }

    function setNumberOfGemsBurnPerAsset(uint32 newQuantity) external override onlyOwner {
        numberOfGemsBurnPerAsset = newQuantity;
        emit NumberOfGemsBurnPerAssetChanged(newQuantity);
    }

    function setNumberOfCatalystsBurnPerAsset(uint32 newQuantity) external override onlyOwner {
        numberOfCatalystBurnPerAsset = newQuantity;
        emit NumberOfCatalystBurnPerAssetChanged(newQuantity);
    }

    function setCustomMintingAllowance(address addressToModify, bool isAddressAllowed) external override onlyOwner {
        customMinterAllowance[addressToModify] = isAddressAllowed;

        emit CustomMintingAllowanceChanged(addressToModify, isAddressAllowed);
    }

    /// @notice mint "quantity" number of Asset token using one catalyst.
    /// @param mintData (-from address creating the Asset, need to be the tx sender or meta tx signer.
    ///  -packId unused packId that will let you predict the resulting tokenId.
    /// - metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// - to destination address receiving the minted tokens.
    /// - data extra data)
    /// @param catalystId Id of the Catalyst ERC20 token to burn (1, 2, 3 or 4).
    /// @param gemIds list of gem ids to burn in the catalyst.
    /// @param quantity number of token to mint
    /// @return assetId The new token Id.
    function mintCustomNumberWithCatalyst(
        MintData calldata mintData,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity,
        uint256 _numberOfCatalystBurnPerAsset,
        uint256 _numberOfGemsBurnPerAsset
    ) external override returns (uint256 assetId) {
        require(
            customMinterAllowance[_msgSender()] == true || _msgSender() == owner(),
            "AssetMinter: custom minting unauthorized"
        );
        require(
            _numberOfCatalystBurnPerAsset == numberOfCatalystBurnPerAsset,
            "AssetMinter: invalid numberOfCatalystBurnPerAsset value "
        );
        require(
            _numberOfGemsBurnPerAsset == numberOfGemsBurnPerAsset,
            "AssetMinter: invalid numberOfGemsBurnPerAsset value"
        );
        assetId = _burnAndMint(mintData, catalystId, gemIds, quantity);
    }

    /// @notice mint "quantity" number of Asset token without using a catalyst.
    /// @param mintData (-from address creating the Asset, need to be the tx sender or meta tx signer.
    ///  -packId unused packId that will let you predict the resulting tokenId.
    /// - metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// - to destination address receiving the minted tokens.
    /// - data extra data)
    /// @param quantity number of token to mint
    /// @return assetId The new token Id.
    function mintCustomNumberWithoutCatalyst(MintData calldata mintData, uint256 quantity)
        external
        override
        returns (uint256 assetId)
    {
        require(
            customMinterAllowance[_msgSender()] == true || _msgSender() == owner(),
            "AssetMinter: custom minting unauthorized"
        );
        _mintRequirements(mintData.from, quantity, mintData.to);
        assetId = _assetERC1155.mint(
            mintData.from,
            mintData.packId,
            mintData.metadataHash,
            quantity,
            mintData.to,
            mintData.data
        );
    }

    /// @notice mint one Asset token with no catalyst.
    /// @param mintData : (-from address creating the Asset, need to be the tx sender or meta tx signer.
    ///  -packId unused packId that will let you predict the resulting tokenId.
    /// - metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// - to destination address receiving the minted tokens.
    /// - data extra data)
    /// @param typeAsset1Based (art, prop...) decide how many asset will be minted (start at 1)
    /// @return assetId The new token Id.
    function mintWithoutCatalyst(
        MintData calldata mintData,
        uint16 typeAsset1Based,
        uint256 quantity
    ) external override returns (uint256 assetId) {
        require(
            quantity == quantitiesByAssetTypeId[typeAsset1Based],
            "AssetMinter: Invalid quantitiesByAssetType value"
        );

        _mintRequirements(mintData.from, quantity, mintData.to);
        assetId = _assetERC1155.mint(
            mintData.from,
            mintData.packId,
            mintData.metadataHash,
            quantity,
            mintData.to,
            mintData.data
        );
    }

    /// @notice mint multiple Asset tokens using one catalyst.
    /// @param mintData : (-from address creating the Asset, need to be the tx sender or meta tx signer.
    ///  -packId unused packId that will let you predict the resulting tokenId.
    /// - metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// - to destination address receiving the minted tokens.
    /// - data extra data)
    /// @param catalystId Id of the Catalyst ERC20 token to burn (1, 2, 3 or 4).
    /// @param gemIds list of gem ids to burn in the catalyst.
    /// @return assetId The new token Id.
    function mintWithCatalyst(
        MintData calldata mintData,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity,
        uint256 _numberOfCatalystBurnPerAsset,
        uint256 _numberOfGemsBurnPerAsset
    ) external override returns (uint256 assetId) {
        require(quantity == quantitiesByCatalystId[catalystId], "AssetMinter : Invalid quantitiesByCatalyst value");
        require(
            _numberOfCatalystBurnPerAsset == numberOfCatalystBurnPerAsset,
            "AssetMinter: invalid numberOfCatalystBurnPerAsset value"
        );
        require(
            _numberOfGemsBurnPerAsset == numberOfGemsBurnPerAsset,
            "AssetMinter: invalid numberOfGemsBurnPerAsset value "
        );

        assetId = _burnAndMint(mintData, catalystId, gemIds, quantity);
    }

    /// @notice mint multiple Asset tokens.
    /// @param mintData contains (-from address creating the Asset, need to be the tx sender or meta tx signer
    /// -packId unused packId that will let you predict the resulting tokenId
    /// -metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata)
    /// @param assets data (gems and catalyst data)
    function mintMultipleWithCatalyst(
        MintData calldata mintData,
        AssetData[] memory assets,
        uint256[] memory supplies,
        uint256 _numberOfCatalystBurnPerAsset,
        uint256 _numberOfGemsBurnPerAsset
    ) external override returns (uint256[] memory assetIds) {
        uint256 assetsLength = assets.length;
        require(assetsLength != 0, "INVALID_0_ASSETS");
        require(assetsLength == supplies.length, "AssetMinter: supplies and assets length mismatch");
        require(mintData.to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(
            _numberOfCatalystBurnPerAsset == numberOfCatalystBurnPerAsset,
            "AssetMinter: invalid numberOfCatalystBurnPerAsset value"
        );
        require(
            _numberOfGemsBurnPerAsset == numberOfGemsBurnPerAsset,
            "AssetMinter: invalid numberOfGemsBurnPerAsset value"
        );
        require(_msgSender() == mintData.from, "AUTH_ACCESS_DENIED");

        _handleMultipleAssetRequirements(mintData.from, assets, supplies);
        assetIds = _assetERC1155.mintMultiple(
            mintData.from,
            mintData.packId,
            mintData.metadataHash,
            supplies,
            "",
            mintData.to,
            mintData.data
        );
        for (uint256 i = 0; i < assetIds.length; i++) {
            require(assets[i].catalystId != 0, "AssetMinter: catalystID can't be 0");
            _registry.setCatalyst(assetIds[i], assets[i].catalystId, assets[i].gemIds);
        }
        return assetIds;
    }

    function mintMultipleWithoutCatalyst(
        MintData calldata mintData,
        uint256[] calldata supplies,
        uint16[] calldata assetTypesIds
    ) external override returns (uint256[] memory assetIds) {
        uint256 suppliesLength = supplies.length;
        require(suppliesLength != 0, "INVALID_0_ASSETS");
        require(suppliesLength == assetTypesIds.length, "AssetMinter: supplies and assets length mismatch");
        require(mintData.to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(_msgSender() == mintData.from, "AUTH_ACCESS_DENIED");
        for (uint256 i = 0; i < suppliesLength; i++) {
            require(
                supplies[i] == quantitiesByAssetTypeId[assetTypesIds[i]],
                "AssetMinter: Invalid quantitiesByAssetType value"
            );
        }
        assetIds = _assetERC1155.mintMultiple(
            mintData.from,
            mintData.packId,
            mintData.metadataHash,
            supplies,
            "",
            mintData.to,
            mintData.data
        );
        return assetIds;
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;

        emit TrustedForwarderChanged(trustedForwarder);
    }

    /// @dev Handler for dealing with assets when minting multiple at once.
    /// @param from The original address that signed the transaction.
    /// @param assets An array of AssetData structs to define how the total gems and catalysts are to be allocated.
    function _handleMultipleAssetRequirements(
        address from,
        AssetData[] memory assets,
        uint256[] memory supplies
    ) internal {
        uint256[] memory catalystsToBurn = new uint256[](_gemsCatalystsRegistry.getNumberOfCatalystContracts());
        uint256[] memory gemsToBurn = new uint256[](_gemsCatalystsRegistry.getNumberOfGemContracts());

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
            require(
                supplies[i] == quantitiesByCatalystId[assets[i].catalystId],
                "AssetMinter: Invalid quantitiesByAssetType value"
            );
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
        uint256[] memory gemFactors = new uint256[](gemIds.length);
        for (uint256 i = 0; i < gemIds.length; i++) {
            gemFactors[i] = 10**(_gemsCatalystsRegistry.getGemDecimals(gemIds[i])) * numTimes;
        }
        _gemsCatalystsRegistry.batchBurnGems(from, gemIds, gemFactors);
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
        _gemsCatalystsRegistry.burnCatalyst(
            from,
            catalystId,
            numTimes * 10**(_gemsCatalystsRegistry.getCatalystDecimals(catalystId))
        );
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
            uint256 gemFactor = 10**_gemsCatalystsRegistry.getGemDecimals(uint16(i + 1));
            scaledQuantities[i] = quantities[i] * gemFactor * numberOfGemsBurnPerAsset;
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
            uint256 catalystFactor = 10**_gemsCatalystsRegistry.getCatalystDecimals(uint16(i + 1));
            scaledQuantities[i] = quantities[i] * catalystFactor * numberOfCatalystBurnPerAsset;
        }
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function _mintRequirements(
        address from,
        uint256 quantity,
        address to
    ) internal view {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(_msgSender() == from, "AUTH_ACCESS_DENIED");
        require(quantity != 0, "AssetMinter: quantity cannot be 0");
    }

    function _burnAndMint(
        MintData calldata mintData,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint256 quantity
    ) internal returns (uint256 assetId) {
        _mintRequirements(mintData.from, quantity, mintData.to);

        _burnCatalyst(mintData.from, catalystId, numberOfCatalystBurnPerAsset);
        _burnGems(mintData.from, gemIds, numberOfGemsBurnPerAsset);

        assetId = _assetERC1155.mint(
            mintData.from,
            mintData.packId,
            mintData.metadataHash,
            quantity,
            mintData.to,
            mintData.data
        );
        _registry.setCatalyst(assetId, catalystId, gemIds);
    }
}
