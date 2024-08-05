// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IRoyaltyUGC} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IRoyaltyUGC.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRoyaltiesProvider, TOTAL_BASIS_POINTS} from "./interfaces/IRoyaltiesProvider.sol";
import {ITransferManager} from "./interfaces/ITransferManager.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ILandToken} from "@sandbox-smart-contracts/land/contracts/interfaces/ILandToken.sol";

/// @author The Sandbox
/// @title TransferManager
/// @notice Manages the transfer of assets with support for different fee structures and beneficiaries.
/// @dev This contract can handle various assets like ERC20, ERC721, and ERC1155 tokens.
abstract contract TransferManager is Initializable, ITransferManager {
    using Address for address;
    using ERC165Checker for address;

    /// @notice Defines the base for representing fees to avoid rounding: 50% == 0.5 * 10000 == 5000.
    uint256 internal constant PROTOCOL_FEE_MULTIPLIER = 10000;

    /// @notice The maximum allowable fee which cannot exceed 50%.
    uint256 internal constant PROTOCOL_FEE_SHARE_LIMIT = 5000;

    /// @notice Royalties are represented in IRoyaltiesProvider.BASE_POINT, they
    /// @notice cannot exceed 50% == 0.5 * BASE_POINTS == 5000
    uint256 internal constant ROYALTY_SHARE_LIMIT = 5000;

    /// @notice Fee applied to primary sales.
    /// @return uint256 of primary sale fee in PROTOCOL_FEE_MULTIPLIER units
    uint256 public protocolFeePrimary;

    /// @notice Fee applied to secondary sales.
    /// @return uint256 of secondary sale fee in PROTOCOL_FEE_MULTIPLIER units
    uint256 public protocolFeeSecondary;

    /// @notice Registry for the different royalties
    /// @return address of royaltiesRegistry
    IRoyaltiesProvider public royaltiesRegistry;

    /// @notice Default receiver of protocol fees
    /// @return address of defaultFeeReceiver
    address public defaultFeeReceiver;

    /// @notice LAND contract address.
    /// @return address of LAND
    ILandToken public landContract;

    /// @notice Emitted when protocol fees are updated.
    /// @param newProtocolFeePrimary fee for primary market
    /// @param newProtocolFeeSecondary fee for secondary market
    event ProtocolFeeSet(uint256 indexed newProtocolFeePrimary, uint256 indexed newProtocolFeeSecondary);

    //// @notice Emitted when the royalties registry is updated.
    /// @param newRoyaltiesRegistry address of new royalties registry
    event RoyaltiesRegistrySet(IRoyaltiesProvider indexed newRoyaltiesRegistry);

    /// @notice Emitted when the default fee receiver is updated.
    /// @param newDefaultFeeReceiver address that gets the fees
    event DefaultFeeReceiverSet(address indexed newDefaultFeeReceiver);

    /// @notice Emitted when the LAND contract address is updated.
    /// @param newLandContract address
    event LandContractSet(ILandToken indexed newLandContract);

    /// @dev This protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializer for TransferExecutor
    /// @param newProtocolFeePrimary Fee for the primary market
    /// @param newProtocolFeeSecondary Fee for the secondary market
    /// @param newDefaultFeeReceiver Address for account receiving fees
    /// @param newRoyaltiesProvider Address of royalties registry
    // solhint-disable-next-line func-name-mixedcase
    function __TransferManager_init_unchained(
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider
    ) internal onlyInitializing {
        _setProtocolFee(newProtocolFeePrimary, newProtocolFeeSecondary);
        _setDefaultFeeReceiver(newDefaultFeeReceiver);
        _setRoyaltiesRegistry(newRoyaltiesProvider);
    }

    /// @notice Executes transfers for 2 matched orders
    /// @param left DealSide from the left order
    /// @param right DealSide from the right order
    /// @dev This is the main entry point, when used as a separated contract this method will be external
    function doTransfers(DealSide memory left, DealSide memory right, LibAsset.FeeSide feeSide) internal override {
        DealSide memory paymentSide;
        DealSide memory nftSide;
        if (feeSide == LibAsset.FeeSide.LEFT) {
            paymentSide = left;
            nftSide = right;
        } else {
            paymentSide = right;
            nftSide = left;
        }
        // Transfer NFT or left side if FeeSide.NONE
        _transfer(nftSide.asset, nftSide.account, paymentSide.recipient);
        // Transfer ERC20 or right side if FeeSide.NONE
        if (feeSide == LibAsset.FeeSide.NONE || _mustSkipFees(nftSide.account)) {
            _transfer(paymentSide.asset, paymentSide.account, nftSide.recipient);
        } else {
            _doTransfersWithFeesAndRoyalties(paymentSide, nftSide);
        }
    }

    /// @notice Sets the royalties registry.
    /// @param newRoyaltiesRegistry Address of new royalties registry
    function _setRoyaltiesRegistry(IRoyaltiesProvider newRoyaltiesRegistry) internal {
        require(
            ERC165Checker.supportsInterface(address(newRoyaltiesRegistry), type(IRoyaltiesProvider).interfaceId),
            "invalid Royalties Registry"
        );
        royaltiesRegistry = newRoyaltiesRegistry;

        emit RoyaltiesRegistrySet(newRoyaltiesRegistry);
    }

    /// @notice Sets the protocol fees.
    /// @param newProtocolFeePrimary Fee for the primary market
    /// @param newProtocolFeeSecondary Fee for the secondary market
    function _setProtocolFee(uint256 newProtocolFeePrimary, uint256 newProtocolFeeSecondary) internal {
        require(newProtocolFeePrimary < PROTOCOL_FEE_SHARE_LIMIT, "invalid primary fee");
        require(newProtocolFeeSecondary < PROTOCOL_FEE_SHARE_LIMIT, "invalid secondary fee");
        protocolFeePrimary = newProtocolFeePrimary;
        protocolFeeSecondary = newProtocolFeeSecondary;

        emit ProtocolFeeSet(newProtocolFeePrimary, newProtocolFeeSecondary);
    }

    /// @notice Sets the LAND contract address.
    /// @param newLandContractAddress Address of new LAND contract
    function _setLandContract(ILandToken newLandContractAddress) internal {
        // TODO: uncomment when ILandToken is supported by LandBase
        // require(ERC165Checker.supportsInterface(address(newLandContractAddress, type(ILandToken).interfaceId), "invalid LAND address");
        landContract = newLandContractAddress;

        emit LandContractSet(newLandContractAddress);
    }

    /// @notice Sets the default fee receiver.
    /// @param newDefaultFeeReceiver Address that gets the fees
    function _setDefaultFeeReceiver(address newDefaultFeeReceiver) internal {
        require(newDefaultFeeReceiver != address(0), "invalid default fee receiver");
        defaultFeeReceiver = newDefaultFeeReceiver;

        emit DefaultFeeReceiverSet(newDefaultFeeReceiver);
    }

    /// @notice Transfer protocol fees and royalties.
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    function _doTransfersWithFeesAndRoyalties(DealSide memory paymentSide, DealSide memory nftSide) internal {
        uint256 fees;
        uint256 remainder = paymentSide.asset.value;
        if (_isTSBSeller(nftSide.account) || _isPrimaryMarket(nftSide)) {
            fees = protocolFeePrimary;
            // No royalties
        } else {
            fees = protocolFeeSecondary;
            remainder = _transferRoyalties(remainder, paymentSide, nftSide);
        }
        if (fees > 0 && remainder > 0) {
            remainder = _transferPercentage(
                remainder,
                paymentSide,
                paymentSide.asset.value,
                defaultFeeReceiver,
                fees,
                PROTOCOL_FEE_MULTIPLIER
            );
        }
        if (remainder > 0) {
            _transfer(LibAsset.Asset(paymentSide.asset.assetType, remainder), paymentSide.account, nftSide.recipient);
        }
    }

    /// @notice Return if this tx is on primary market
    /// @param nftSide DealSide of the nft-side order
    /// @return creator Address or zero if is not able to retrieve it
    function _isPrimaryMarket(DealSide memory nftSide) internal view returns (bool) {
        address creator = _getCreator(nftSide.asset.assetType);
        return creator != address(0) && nftSide.account == creator;
    }

    /// @notice Transfer royalties.
    /// @param remainder How much of the amount left after previous transfers
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    /// @return How much left after paying royalties
    function _transferRoyalties(
        uint256 remainder,
        DealSide memory paymentSide,
        DealSide memory nftSide
    ) internal returns (uint256) {
        if (nftSide.asset.assetType.assetClass == LibAsset.AssetClass.BUNDLE) {
            LibAsset.Bundle memory bundle = LibAsset.decodeBundle(nftSide.asset.assetType);

            for (uint256 i; i < bundle.bundledERC721.length; i++) {
                address token = bundle.bundledERC721[i].erc721Address;
                uint256 idLength = bundle.bundledERC721[i].ids.length;
                for (uint256 j; j < idLength; j++) {
                    IRoyaltiesProvider.Part[] memory royalties = royaltiesRegistry.getRoyalties(
                        token,
                        bundle.bundledERC721[i].ids[j]
                    );

                    remainder = _applyRoyalties(
                        remainder,
                        paymentSide,
                        bundle.priceDistribution.erc721Prices[i][j],
                        royalties,
                        nftSide.recipient
                    );
                }
            }

            for (uint256 i; i < bundle.bundledERC1155.length; i++) {
                address token = bundle.bundledERC1155[i].erc1155Address;
                uint256 idLength = bundle.bundledERC1155[i].ids.length;
                require(idLength == bundle.bundledERC1155[i].supplies.length, "ERC1155 array error");
                for (uint256 j; j < idLength; j++) {
                    IRoyaltiesProvider.Part[] memory royalties = royaltiesRegistry.getRoyalties(
                        token,
                        bundle.bundledERC1155[i].ids[j]
                    );
                    remainder = _applyRoyalties(
                        remainder,
                        paymentSide,
                        bundle.priceDistribution.erc1155Prices[i][j],
                        royalties,
                        nftSide.recipient
                    );
                }
            }

            uint256 quadSize = bundle.quads.xs.length;
            if (quadSize > 0) {
                for (uint256 i = 0; i < quadSize; i++) {
                    uint256 size = bundle.quads.sizes[i];
                    uint256 x = bundle.quads.xs[i];
                    uint256 y = bundle.quads.ys[i];

                    uint256 tokenId = idInPath(0, size, x, y);
                    IRoyaltiesProvider.Part[] memory royalties = royaltiesRegistry.getRoyalties(
                        address(landContract),
                        tokenId
                    );

                    remainder = _applyRoyalties(
                        remainder,
                        paymentSide,
                        bundle.priceDistribution.quadPrices[i],
                        royalties,
                        nftSide.recipient
                    );
                }
            }
        } else {
            (address token, uint256 tokenId) = LibAsset.decodeToken(nftSide.asset.assetType);
            IRoyaltiesProvider.Part[] memory royalties = royaltiesRegistry.getRoyalties(token, tokenId);
            remainder = _applyRoyalties(remainder, paymentSide, remainder, royalties, nftSide.recipient);
        }
        return remainder;
    }

    function _applyRoyalties(
        uint256 remainder,
        DealSide memory paymentSide,
        uint256 assetPrice,
        IRoyaltiesProvider.Part[] memory royalties,
        address recipient
    ) internal returns (uint256) {
        uint256 totalRoyalties;
        uint256 len = royalties.length;
        for (uint256 i; i < len; i++) {
            IRoyaltiesProvider.Part memory r = royalties[i];
            totalRoyalties += r.basisPoints;
            if (r.account == recipient) {
                // We just skip the transfer because the nftSide will get the full payment anyway.
                continue;
            }
            remainder = _transferPercentage(
                remainder,
                paymentSide,
                assetPrice,
                r.account,
                r.basisPoints,
                TOTAL_BASIS_POINTS
            );
        }
        require(totalRoyalties <= ROYALTY_SHARE_LIMIT, "royalties are too high (>50%)");
        return remainder;
    }

    /// @notice Do a transfer based on a percentage (in basis points)
    /// @param remainder How much of the amount left after previous transfers
    /// @param paymentSide DealSide of the fee-side order
    /// @param to Account that will receive the asset
    /// @param percentage Percentage to be transferred multiplied by the multiplier
    /// @param multiplier Percentage is multiplied by this number to avoid rounding (2.5% == 0.025) * multiplier
    /// @return How much left after current transfer
    function _transferPercentage(
        uint256 remainder,
        DealSide memory paymentSide,
        uint256 assetPrice,
        address to,
        uint256 percentage,
        uint256 multiplier
    ) internal returns (uint256) {
        LibAsset.Asset memory payment = LibAsset.Asset(paymentSide.asset.assetType, 0);
        uint256 fee = (assetPrice * percentage) / multiplier;
        if (remainder > fee) {
            remainder = remainder - fee;
            payment.value = fee;
        } else {
            payment.value = remainder;
            remainder = 0;
        }
        if (payment.value > 0) {
            _transfer(payment, paymentSide.account, to);
        }
        return remainder;
    }

    /// @notice Return the creator of the token if the token supports IRoyaltyUGC
    /// @param assetType Asset type
    /// @return creator Address or zero if is not able to retrieve it
    function _getCreator(LibAsset.AssetType memory assetType) internal view returns (address creator) {
        (address token, uint256 tokenId) = LibAsset.decodeToken(assetType);
        if (token.supportsInterface(type(IRoyaltyUGC).interfaceId)) {
            creator = IRoyaltyUGC(token).getCreatorAddress(tokenId);
        }
    }

    /// @notice Function should be able to transfer any supported Asset
    /// @param asset Asset to be transferred
    /// @param from Account holding the asset
    /// @param to Account that will receive the asset
    /// @dev This is the main entry point, when used as a separated contract this method will be external
    function _transfer(LibAsset.Asset memory asset, address from, address to) internal {
        if (asset.assetType.assetClass == LibAsset.AssetClass.ERC20) {
            address token = LibAsset.decodeAddress(asset.assetType);
            // slither-disable-next-line arbitrary-send-erc20
            _transferERC20(token, from, to, asset.value);
        } else if (asset.assetType.assetClass == LibAsset.AssetClass.ERC721) {
            (address token, uint256 tokenId) = LibAsset.decodeToken(asset.assetType);
            require(asset.value == 1, "erc721 value error");
            _transferERC721(token, from, to, tokenId);
        } else if (asset.assetType.assetClass == LibAsset.AssetClass.ERC1155) {
            (address token, uint256 tokenId) = LibAsset.decodeToken(asset.assetType);
            _transferERC1155(token, from, to, tokenId, asset.value);
        } else if (asset.assetType.assetClass == LibAsset.AssetClass.BUNDLE) {
            LibAsset.Bundle memory bundle = LibAsset.decodeBundle(asset.assetType);
            uint256 erc20Length = bundle.bundledERC20.length;
            uint256 erc721Length = bundle.bundledERC721.length;
            uint256 erc1155Length = bundle.bundledERC1155.length;
            uint256 quadsLength = bundle.quads.xs.length;
            if (erc721Length > 0 || quadsLength > 0) require(asset.value == 1, "bundle value error");
            for (uint256 i; i < erc20Length; i++) {
                address token = bundle.bundledERC20[i].erc20Address;
                _transferERC20(token, from, to, bundle.bundledERC20[i].value);
            }
            for (uint256 i; i < erc721Length; i++) {
                address token = bundle.bundledERC721[i].erc721Address;
                uint256 idLength = bundle.bundledERC721[i].ids.length;
                for (uint256 j; j < idLength; j++) {
                    _transferERC721(token, from, to, bundle.bundledERC721[i].ids[j]);
                }
            }
            for (uint256 i; i < erc1155Length; i++) {
                address token = bundle.bundledERC1155[i].erc1155Address;
                uint256 idLength = bundle.bundledERC1155[i].ids.length;
                require(idLength == bundle.bundledERC1155[i].supplies.length, "ERC1155 array error");
                for (uint256 j; j < idLength; j++) {
                    _transferERC1155(
                        token,
                        from,
                        to,
                        bundle.bundledERC1155[i].ids[j],
                        bundle.bundledERC1155[i].supplies[j]
                    );
                }
            }
            if (quadsLength > 0) {
                require(quadsLength == bundle.quads.ys.length, "quad error");
                require(quadsLength == bundle.quads.sizes.length, "quad size error");
                landContract.batchTransferQuad(
                    from,
                    to,
                    bundle.quads.sizes,
                    bundle.quads.xs,
                    bundle.quads.ys,
                    bundle.quads.data
                );
            }
        } else {
            revert("invalid asset class");
        }
    }

    /// @notice Function should be able to transfer ERC20 Asset
    /// @param token ERC20 token contract address
    /// @param from Account holding the asset
    /// @param to Account that will receive the asset
    /// @param assetValue The value to be transferred
    function _transferERC20(address token, address from, address to, uint256 assetValue) internal {
        // slither-disable-next-line arbitrary-send-erc20
        SafeERC20.safeTransferFrom(IERC20(token), from, to, assetValue);
    }

    /// @notice Function should be able to transfer ERC721 Asset
    /// @param token ERC721 token contract address
    /// @param from Account holding the asset
    /// @param to Account that will receive the asset
    /// @param id The token id to be transferred
    function _transferERC721(address token, address from, address to, uint256 id) internal {
        IERC721(token).safeTransferFrom(from, to, id);
    }

    /// @notice Function should be able to transfer ERC1155 Asset
    /// @param token ERC1155 token contract address
    /// @param from Account holding the asset
    /// @param to Account that will receive the asset
    /// @param id The token id to be transferred
    /// @param supply The supply of that token id to be transferred
    function _transferERC1155(address token, address from, address to, uint256 id, uint256 supply) internal {
        IERC1155(token).safeTransferFrom(from, to, id, supply, "");
    }

    /// @notice Function deciding if the fees are applied or not, to be override
    /// @param from Address to check
    function _mustSkipFees(address from) internal virtual returns (bool);

    /// @notice return the quadId given and index, size and coordinates
    /// @param i the index to be added to x,y to get row and column
    /// @param size The bottom left x coordinate of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return the tokenId of the quad
    /// @dev this method is gas optimized, must be called with verified x,y and size, after a call to _isValidQuad
    function idInPath(uint256 i, uint256 size, uint256 x, uint256 y) internal view returns (uint256) {
        unchecked {
            return (x + (i % size)) + (y + (i / size)) * landContract.width();
        }
    }

    /// @notice Function deciding if the seller is a TSB seller, to be override
    /// @param from Address to check
    function _isTSBSeller(address from) internal virtual returns (bool);

    // slither-disable-next-line unused-state
    uint256[49] private __gap;
}
