pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./contracts_common/src/Interfaces/ERC20.sol";
import "./Interfaces/ERC20Extended.sol";
import "./contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "./contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "./Catalyst/ERC20Group.sol";
import "./Catalyst/CatalystToken.sol";
import "./CatalystRegistry.sol";


/// @notice Gateway to mint Asset with Catalyst, Gems and Sand
contract CatalystMinter is MetaTransactionReceiver {
    /// @dev emitted when fee collector (that receive the sand fee) get changed
    /// @param newCollector address of the new collector, address(0) means the fee will be burned
    event FeeCollector(address newCollector);

    function setFeeCollector(address newCollector) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        _setFeeCollector(newCollector);
    }

    /// @notice mint one Asset token.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param catalystToken address of the Catalyst ERC20 token to burn.
    /// @param gemIds list of gem ids to burn in the catalyst.
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    function mint(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        uint256 quantity,
        address to,
        bytes calldata data
    ) external returns (uint256) {
        _checkAuthorization(from, to);
        _checkAndBurnCatalyst(from, catalystToken);
        uint8 rarity = _checkQuantityAndBurnSandAndGems(from, catalystToken, gemIds, quantity);
        uint256 id = _asset.mint(from, packId, metadataHash, quantity, rarity, to, data);
        _catalystRegistry.setCatalyst(id, catalystToken, gemIds);
        return id;
    }

    function _checkQuantityAndBurnSandAndGems(
        address from,
        CatalystToken catalystToken,
        uint256[] memory gemIds,
        uint256 quantity
    ) internal returns (uint8) {
        (uint8 rarity, uint16 maxGems, uint16 minQuantity, uint16 maxQuantity, uint256 sandFee) = catalystToken.getMintData();
        require(minQuantity <= quantity && quantity <= maxQuantity, "invalid quantity");
        _checkAndBurnGems(from, maxGems, gemIds);
        if (_feeCollector == address(0)) {
            _sand.burnFor(from, quantity * sandFee); // TODO Safe math
        } else {
            _sand.transferFrom(from, _feeCollector, quantity * sandFee); // TODO Safe math
        }
        return rarity;
    }

    /// @notice associate a catalyst to a fungible Asset token by extracting it as ERC721 first.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset being extracted.
    /// @param catalystToken address of the catalyst token to use and burn.
    /// @param gemIds list of gems to socket into the catalyst (burned).
    /// @param to destination address receiving the extracted and upgraded ERC721 Asset token.
    function extractAndChangeCatalyst(
        address from,
        uint256 assetId,
        // uint40 packId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        address to
    ) external returns (uint256 tokenId) {
        _checkAuthorization(from, to);
        tokenId = _asset.extractERC721From(from, assetId, from);
        // TODO? if we want rarity to follow catalyst because without updateERC721 rarity cannot be changed
        // uint256 extractedTokenId = _asset.extractERC721From(from, assetId, from);
        // tokenId = _asset.updateERC721(from, extractedTokenId, packId,
        _changeCatalyst(from, tokenId, catalystToken, gemIds, to);
    }

    /// @notice associate a new catalyst to a non-fungible Asset token.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset being updated.
    /// @param catalystToken address of the catalyst token to use and burn.
    /// @param gemIds list of gems to socket into the catalyst (burned).
    /// @param to destination address receiving the Asset token.
    function changeCatalyst(
        address from,
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        address to
    ) external returns (uint256 tokenId) {
        // TODO? if we want rarity to follow catalyst because without updateERC721 rarity cannot be changed
        // : updateERC721
        // tokenId =
        _checkAuthorization(from, to);
        _changeCatalyst(from, assetId, catalystToken, gemIds, to);
        return assetId;
    }

    /// @notice add gems to a fungible Asset token by extracting it as ERC721 first.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset being extracted.
    /// @param gemIds list of gems to socket into the existing catalyst (burned).
    /// @param to destination address receiving the extracted and upgraded ERC721 Asset token.
    function extractAndAddGems(
        address from,
        uint256 assetId,
        uint256[] calldata gemIds,
        address to
    ) external {
        _checkAuthorization(from, to);
        uint256 id = _asset.extractERC721From(from, assetId, from);
        _addGems(from, id, gemIds, to);
    }

    /// @notice add gems to a non-fungible Asset token.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset to which the gems will be added to.
    /// @param gemIds list of gems to socket into the existing catalyst (burned).
    /// @param to destination address receiving the extracted and upgraded ERC721 Asset token.
    function addGems(
        address from,
        uint256 assetId,
        uint256[] calldata gemIds,
        address to
    ) external {
        _checkAuthorization(from, to);
        _addGems(from, assetId, gemIds, to);
    }

    struct AssetData {
        uint256[] gemIds;
        uint256 supply;
        CatalystToken catalystToken;
    }

    /// @notice mint multiple Asset tokens.
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer.
    /// @param packId unused packId that will let you predict the resulting tokenId.
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata.
    /// @param assets contains the data to associate catalyst and gems to the assets.
    /// @param to destination address receiving the minted tokens.
    /// @param data extra data.
    function mintMultiple(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        AssetData[] memory assets,
        address to,
        bytes memory data
    ) public returns (uint256[] memory ids) {
        _checkAuthorization(from, to);
        return _mintMultiple(from, packId, metadataHash, assets, to, data);
    }

    // //////////////////// INTERNALS ////////////////////

    function _mintMultiple(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        AssetData[] memory assets,
        address to,
        bytes memory data
    ) internal returns (uint256[] memory ids) {
        (uint256 totalSandFee, uint256[] memory supplies, bytes memory rarities) = _handleMultipleCatalysts(from, assets);

        _sand.burnFor(from, totalSandFee);

        return _mintAssets(from, packId, metadataHash, assets, supplies, rarities, to, data);
    }

    function _handleMultipleCatalysts(address from, AssetData[] memory assets)
        internal
        returns (
            uint256 totalSandFee,
            uint256[] memory supplies,
            bytes memory rarities
        )
    {
        totalSandFee = 0;

        rarities = new bytes(assets.length / 4);
        supplies = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            _checkAndBurnCatalyst(from, assets[i].catalystToken);
            (uint8 rarity, uint16 maxGems, uint16 minQuantity, uint16 maxQuantity, uint256 sandFee) = assets[i].catalystToken.getMintData();
            require(minQuantity <= assets[i].supply && assets[i].supply <= maxQuantity, "invalid quantity");
            supplies[i] = assets[i].supply;
            totalSandFee += sandFee * assets[i].supply;
            require(assets[i].gemIds.length <= maxGems, "too many gems for catalyst");
            _gems.burnEachFor(from, assets[i].gemIds, 1);
            rarities[i / 4] = rarities[i / 4] | bytes1(uint8(rarity * 2**((3 - (i % 4)) * 2)));
        }
    }

    function _mintAssets(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        AssetData[] memory assets,
        uint256[] memory supplies,
        bytes memory rarities,
        address to,
        bytes memory data
    ) internal returns (uint256[] memory tokenIds) {
        tokenIds = _asset.mintMultiple(from, packId, metadataHash, supplies, rarities, to, data);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            AssetData memory asset = assets[i];
            _catalystRegistry.setCatalyst(tokenIds[i], asset.catalystToken, asset.gemIds);
        }
    }

    function _changeCatalyst(
        address from,
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] memory gemIds,
        address to
    ) internal {
        require(assetId & IS_NFT > 0, "NEED TO BE AN NFT"); // Asset (ERC1155ERC721.sol) ensure NFT will return true here and non-NFT will reyrn false
        _checkAndBurnCatalyst(from, catalystToken);
        (, uint16 maxGems, , , ) = catalystToken.getMintData();
        _checkAndBurnGems(from, maxGems, gemIds);

        _catalystRegistry.setCatalyst(assetId, catalystToken, gemIds);

        _transfer(from, to, assetId);
    }

    function _addGems(
        address from,
        uint256 assetId,
        uint256[] memory gemIds,
        address to
    ) internal {
        require(assetId & IS_NFT > 0, "NEED TO BE AN NFT"); // Asset (ERC1155ERC721.sol) ensure NFT will return true here and non-NFT will reyrn false
        CatalystRegistry.CatalystStored memory catalyst = _catalystRegistry.getCatalyst(assetId);
        (, uint16 maxGems, , , ) = catalyst.token.getMintData();
        require(gemIds.length + catalyst.gems.length <= maxGems, "too many gems");

        _catalystRegistry.addGems(assetId, gemIds);

        _transfer(from, to, assetId);
    }

    function _transfer(
        address from,
        address to,
        uint256 assetId
    ) internal {
        if (from != to) {
            _asset.safeTransferFrom(from, to, assetId);
        }
    }

    function _checkAuthorization(address from, address to) internal view {
        require(to != address(0), "INVALID ADDRESS ZERO");
        require(from == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
    }

    function _checkAndBurnGems(
        address from,
        uint256 maxGems,
        uint256[] memory gemIds
    ) internal {
        require(gemIds.length <= maxGems, "too many gems");
        _gems.burnEachFor(from, gemIds, 1);
    }

    function _checkAndBurnCatalyst(address from, CatalystToken catalystToken) internal {
        require(_validCatalysts[catalystToken], "invalid catalyst");
        catalystToken.burnFor(from, 1);
    }

    function _setFeeCollector(address newCollector) internal {
        _feeCollector = newCollector;
        emit FeeCollector(newCollector);
    }

    // /////////////////// UTILITIES /////////////////////
    using SafeMathWithRequire for uint256;

    // //////////////////////// DATA /////////////////////
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;

    ERC20Extended _sand;
    AssetToken _asset;
    ERC20Group _gems;
    mapping(CatalystToken => bool) _validCatalysts;
    CatalystRegistry _catalystRegistry;
    address _feeCollector;

    // /////////////////// CONSTRUCTOR ////////////////////
    constructor(
        CatalystRegistry catalystRegistry,
        ERC20Extended sand,
        AssetToken asset,
        ERC20Group gems,
        address metaTx,
        address admin,
        address feeCollector,
        CatalystToken[] memory catalysts
    ) public {
        _catalystRegistry = catalystRegistry;
        _sand = sand;
        _asset = asset;
        _gems = gems;
        _admin = admin;
        _setFeeCollector(feeCollector);
        _setMetaTransactionProcessor(metaTx, true);
        for (uint256 i = 0; i < catalysts.length; i++) {
            _validCatalysts[catalysts[i]] = true;
        }
    }
}
