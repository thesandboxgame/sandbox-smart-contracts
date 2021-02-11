//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./AssetAttributesRegistry.sol";
import "./GemsCatalystsRegistry.sol";
import "../common/Interfaces/IERC20Extended.sol";
import "../common/Interfaces/IAssetToken.sol";
import "../common/BaseWithStorage/WithMetaTransaction.sol";

/// @notice Allow to upgrade Asset with Catalyst, Gems and Sand, giving the assets attributes through AssetAttributeRegistry
contract AssetUpgrader is WithMetaTransaction {
    using SafeMath for uint256;

    address public immutable feeRecipient;
    uint256 public immutable upgradeFee;
    uint256 public immutable gemAdditionFee;
    uint256 private constant GEM_UNIT = 1000000000000000000;
    uint256 private constant CATALYST_UNIT = 1000000000000000000;
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;
    address private constant BURN_ADDRESS = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    IERC20Extended internal immutable _sand;
    AssetAttributesRegistry internal immutable _registry;
    IAssetToken internal immutable _asset;
    GemsCatalystsRegistry internal immutable _gemsCatalystsRegistry;

    /// @notice AssetUpgrader depends on
    /// @param registry: AssetAttributesRegistry for recording catalyst and gems used
    /// @param sand: ERC20 for fee payment
    /// @param asset: Asset Token Contract (dual ERC1155/ERC721)
    /// @param gemsCatalystsRegistry: that track the canonical catalyst and gems and provide batch burning facility
    /// @param _upgradeFee: the fee in Sand paid for an upgrade (setting or replacing a catalyst)
    /// @param _gemAdditionFee: the fee in Sand paid for adding gems
    /// @param _feeRecipient: address receiving the Sand fee
    constructor(
        AssetAttributesRegistry registry,
        IERC20Extended sand,
        IAssetToken asset,
        GemsCatalystsRegistry gemsCatalystsRegistry,
        uint256 _upgradeFee,
        uint256 _gemAdditionFee,
        address _feeRecipient
    ) {
        _registry = registry;
        _sand = sand;
        _asset = asset;
        _gemsCatalystsRegistry = gemsCatalystsRegistry;
        upgradeFee = _upgradeFee;
        gemAdditionFee = _gemAdditionFee;
        feeRecipient = _feeRecipient;
    }

    /// @notice associate a catalyst to a fungible Asset token by extracting it as ERC721 first.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset being extracted.
    /// @param catalystId address of the catalyst token to use and burn.
    /// @param gemIds list of gems to socket into the catalyst (burned).
    /// @param to destination address receiving the extracted and upgraded ERC721 Asset token.
    function extractAndSetCatalyst(
        address from,
        uint256 assetId,
        uint16 catalystId,
        uint16[] calldata gemIds,
        address to
    ) external returns (uint256 tokenId) {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        _checkAuthorization(from);
        tokenId = _asset.extractERC721From(from, assetId, from);
        _changeCatalyst(from, tokenId, catalystId, gemIds, to);
    }

    /// @notice associate a new catalyst to a non-fungible Asset token.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset being updated.
    /// @param catalystId address of the catalyst token to use and burn.
    /// @param gemIds list of gems to socket into the catalyst (burned).
    /// @param to destination address receiving the Asset token.
    function changeCatalyst(
        address from,
        uint256 assetId,
        uint16 catalystId,
        uint16[] calldata gemIds,
        address to
    ) external returns (uint256 tokenId) {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        _checkAuthorization(from);
        _changeCatalyst(from, assetId, catalystId, gemIds, to);
        return assetId;
    }

    /// @notice add gems to a non-fungible Asset token.
    /// @param from address from which the Asset token belongs to.
    /// @param assetId tokenId of the Asset to which the gems will be added to.
    /// @param gemIds list of gems to socket into the existing catalyst (burned).
    /// @param to destination address receiving the extracted and upgraded ERC721 Asset token.
    function addGems(
        address from,
        uint256 assetId,
        uint16[] calldata gemIds,
        address to
    ) external {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        _checkAuthorization(from);
        _addGems(from, assetId, gemIds, to);
    }

    function _chargeSand(address from, uint256 sandFee) internal {
        if (feeRecipient != address(0) && sandFee != 0) {
            if (feeRecipient == address(BURN_ADDRESS)) {
                // special address for burn
                _sand.burnFor(from, sandFee);
            } else {
                _sand.transferFrom(from, feeRecipient, sandFee);
            }
        }
    }

    function _changeCatalyst(
        address from,
        uint256 assetId,
        uint16 catalystId,
        uint16[] memory gemIds,
        address to
    ) internal {
        require(assetId & IS_NFT != 0, "INVALID_NOT_NFT"); // Asset (ERC1155ERC721.sol) ensure NFT will return true here and non-NFT will return false
        _burnCatalyst(from, catalystId);
        _burnGems(from, gemIds);
        _chargeSand(from, upgradeFee);
        _registry.setCatalyst(assetId, catalystId, gemIds);
        _transfer(from, to, assetId);
    }

    function _addGems(
        address from,
        uint256 assetId,
        uint16[] memory gemIds,
        address to
    ) internal {
        require(assetId & IS_NFT != 0, "INVALID_NOT_NFT"); // Asset (ERC1155ERC721.sol) ensure NFT will return true here and non-NFT will return false
        _burnGems(from, gemIds);
        _chargeSand(from, gemAdditionFee); // TODO per gems or flat fee ?
        _registry.addGems(assetId, gemIds);
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

    function _burnGems(address from, uint16[] memory gemIds) internal {
        _gemsCatalystsRegistry.burnDifferentGems(from, gemIds, GEM_UNIT);
    }

    function _burnCatalyst(address from, uint16 catalystId) internal {
        _gemsCatalystsRegistry.burnCatalyst(from, catalystId, CATALYST_UNIT);
    }
}
