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
/// @custom:security-contact contact-blockchain@sandbox.game
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

    /// @dev grid size of the land used to calculate ids
    uint256 internal constant GRID_SIZE = 408;

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

        LibAsset.verifyPriceDistribution(nftSide.asset, nftSide.asset.value, paymentSide.asset.value);

        (address paymentSideRecipient, address nftSideRecipient) = _getRecipients(paymentSide, nftSide);

        // Transfer ERC20 or right side if FeeSide.NONE
        if (feeSide == LibAsset.FeeSide.NONE || _mustSkipFees(nftSide.account)) {
            _transfer(paymentSide.asset, paymentSide.account, nftSideRecipient);
        } else {
            _doTransfersWithFeesAndRoyalties(paymentSide, nftSide);
        }

        // Transfer NFT or left side if FeeSide.NONE
        // NFT transfer when exchanging more than one bundle of ERC1155s
        if (nftSide.asset.assetType.assetClass == LibAsset.AssetClass.BUNDLE && nftSide.asset.value > 1) {
            for (uint256 i = 0; i < nftSide.asset.value; ++i) {
                _transfer(nftSide.asset, nftSide.account, paymentSideRecipient);
            }
        } else {
            _transfer(nftSide.asset, nftSide.account, paymentSideRecipient);
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
        require(
            ERC165Checker.supportsInterface(address(newLandContractAddress), type(ILandToken).interfaceId),
            "Invalid LAND address"
        );
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

    function _getRecipients(
        DealSide memory paymentSide,
        DealSide memory nftSide
    ) internal pure returns (address paymentSideRecipient, address nftSideRecipient) {
        address decodedPaymentSideRecipient = LibAsset.decodeRecipient(paymentSide.asset.assetType);
        address decodedNftSideRecipient = LibAsset.decodeRecipient(nftSide.asset.assetType);

        if (decodedPaymentSideRecipient != address(0)) {
            paymentSideRecipient = decodedPaymentSideRecipient;
        } else {
            paymentSideRecipient = paymentSide.account;
        }

        if (decodedNftSideRecipient != address(0)) {
            nftSideRecipient = decodedNftSideRecipient;
        } else {
            nftSideRecipient = nftSide.account;
        }
    }

    /// @notice Transfer protocol fees and royalties.
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    function _doTransfersWithFeesAndRoyalties(DealSide memory paymentSide, DealSide memory nftSide) internal {
        uint256 remainder = paymentSide.asset.value;
        (, address nftSideRecipient) = _getRecipients(paymentSide, nftSide);

        (uint256 fees, bool shouldTransferRoyalties) = _calculateFeesAndRoyalties(nftSide);
        bool isBundle = nftSide.asset.assetType.assetClass == LibAsset.AssetClass.BUNDLE;

        if (isBundle) {
            if (!_isTSBSeller(nftSide.account)) {
                remainder = _doTransfersWithFeesAndRoyaltiesForBundle(paymentSide, nftSide, nftSideRecipient);
            } else {
                // No royalties but primary fee should be paid on the total value of the bundle
                remainder = _transferProtocolFees(remainder, paymentSide, fees);
            }
        } else if (shouldTransferRoyalties) {
            remainder = _transferRoyalties(remainder, paymentSide, nftSide);
        }
        if (!isBundle) {
            remainder = _transferProtocolFees(remainder, paymentSide, fees);
        }

        if (remainder > 0) {
            _transfer(LibAsset.Asset(paymentSide.asset.assetType, remainder), paymentSide.account, nftSideRecipient);
        }
    }

    function _calculateFeesAndRoyalties(
        DealSide memory nftSide
    ) internal returns (uint256 fees, bool shouldTransferRoyalties) {
        if (_isTSBSeller(nftSide.account) || _isPrimaryMarket(nftSide)) {
            fees = protocolFeePrimary;
            shouldTransferRoyalties = false;
        } else {
            fees = protocolFeeSecondary;
            shouldTransferRoyalties = true;
        }
    }

    function _transferProtocolFees(
        uint256 remainder,
        DealSide memory paymentSide,
        uint256 fees
    ) internal returns (uint256) {
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
        return remainder;
    }

    function _doTransfersWithFeesAndRoyaltiesForBundle(
        DealSide memory paymentSide,
        DealSide memory nftSide,
        address nftSideRecipient
    ) internal returns (uint256 remainder) {
        remainder = paymentSide.asset.value;
        uint256 feePrimary = protocolFeePrimary;
        uint256 feeSecondary = protocolFeeSecondary;
        LibAsset.Bundle memory bundle = LibAsset.decodeBundle(nftSide.asset.assetType);

        remainder = _processERC721Bundles(
            paymentSide,
            nftSide,
            nftSideRecipient,
            remainder,
            feePrimary,
            feeSecondary,
            bundle
        );
        remainder = _processERC1155Bundles(
            paymentSide,
            nftSide,
            nftSideRecipient,
            remainder,
            feePrimary,
            feeSecondary,
            bundle
        );
        remainder = _processQuadBundles(paymentSide, nftSideRecipient, remainder, feeSecondary, bundle);
        return remainder;
    }

    function _processERC721Bundles(
        DealSide memory paymentSide,
        DealSide memory nftSide,
        address nftSideRecipient,
        uint256 remainder,
        uint256 feePrimary,
        uint256 feeSecondary,
        LibAsset.Bundle memory bundle
    ) internal returns (uint256) {
        uint256 bundledERC721Length = bundle.bundledERC721.length;
        for (uint256 i; i < bundledERC721Length; ++i) {
            address token = bundle.bundledERC721[i].erc721Address;
            uint256 idLength = bundle.bundledERC721[i].ids.length;
            for (uint256 j; j < idLength; ++j) {
                remainder = _processSingleAsset(
                    paymentSide,
                    nftSide,
                    nftSideRecipient,
                    remainder,
                    feePrimary,
                    feeSecondary,
                    token,
                    bundle.bundledERC721[i].ids[j],
                    bundle.priceDistribution.erc721Prices[i][j]
                );
            }
        }
        return remainder;
    }

    function _processERC1155Bundles(
        DealSide memory paymentSide,
        DealSide memory nftSide,
        address nftSideRecipient,
        uint256 remainder,
        uint256 feePrimary,
        uint256 feeSecondary,
        LibAsset.Bundle memory bundle
    ) internal returns (uint256) {
        for (uint256 i; i < bundle.bundledERC1155.length; ++i) {
            address token = bundle.bundledERC1155[i].erc1155Address;
            uint256 idLength = bundle.bundledERC1155[i].ids.length;
            require(idLength == bundle.bundledERC1155[i].supplies.length, "ERC1155 array error");

            for (uint256 j; j < idLength; ++j) {
                for (uint256 k = 0; k < nftSide.asset.value; ++k) {
                    remainder = _processSingleAsset(
                        paymentSide,
                        nftSide,
                        nftSideRecipient,
                        remainder,
                        feePrimary,
                        feeSecondary,
                        token,
                        bundle.bundledERC1155[i].ids[j],
                        bundle.priceDistribution.erc1155Prices[i][j]
                    );
                }
            }
        }
        return remainder;
    }

    function _processQuadBundles(
        DealSide memory paymentSide,
        address nftSideRecipient,
        uint256 remainder,
        uint256 feeSecondary,
        LibAsset.Bundle memory bundle
    ) internal returns (uint256) {
        uint256 quadSize = bundle.quads.xs.length;
        for (uint256 i = 0; i < quadSize; ++i) {
            uint256 size = bundle.quads.sizes[i];
            uint256 x = bundle.quads.xs[i];
            uint256 y = bundle.quads.ys[i];

            uint256 tokenId = idInPath(0, size, x, y);
            remainder = _transferFeesAndRoyaltiesForBundledAsset(
                paymentSide,
                address(landContract),
                nftSideRecipient,
                remainder,
                tokenId,
                bundle.priceDistribution.quadPrices[i],
                feeSecondary
            );
        }
        return remainder;
    }

    function _processSingleAsset(
        DealSide memory paymentSide,
        DealSide memory nftSide,
        address nftSideRecipient,
        uint256 remainder,
        uint256 feePrimary,
        uint256 feeSecondary,
        address token,
        uint256 tokenId,
        uint256 assetPrice
    ) internal returns (uint256) {
        if (_isPrimaryMarketForBundledAsset(nftSide.account, token, tokenId)) {
            if (feePrimary > 0 && remainder > 0) {
                remainder = _transferPercentage(
                    remainder,
                    paymentSide,
                    assetPrice,
                    defaultFeeReceiver,
                    feePrimary,
                    PROTOCOL_FEE_MULTIPLIER
                );
            }
        } else {
            remainder = _transferFeesAndRoyaltiesForBundledAsset(
                paymentSide,
                token,
                nftSideRecipient,
                remainder,
                tokenId,
                assetPrice,
                feeSecondary
            );
        }
        return remainder;
    }

    function _transferFeesAndRoyaltiesForBundledAsset(
        DealSide memory paymentSide,
        address token,
        address nftSideRecipient,
        uint256 remainder,
        uint256 tokenId,
        uint256 assetPrice,
        uint256 fees
    ) internal returns (uint256) {
        IRoyaltiesProvider.Part[] memory royalties;

        royalties = royaltiesRegistry.getRoyalties(token, tokenId);
        remainder = _applyRoyalties(remainder, paymentSide, assetPrice, royalties, nftSideRecipient);
        if (fees > 0 && remainder > 0) {
            remainder = _transferPercentage(
                remainder,
                paymentSide,
                assetPrice,
                defaultFeeReceiver,
                fees,
                PROTOCOL_FEE_MULTIPLIER
            );
        }
        return remainder;
    }

    /// @notice Return if this tx is on primary market
    /// @param nftSide DealSide of the nft-side order
    /// @return creator Address or zero if is not able to retrieve it
    function _isPrimaryMarket(DealSide memory nftSide) internal view returns (bool) {
        address creator = _getCreator(nftSide.asset.assetType);
        return creator != address(0) && nftSide.account == creator;
    }

    /// @notice Return if this tx is on primary market for bundled asset
    /// @param nftSideAccount The account associated with the NFT side of the deal.
    /// @param token The address of the token contract.
    /// @param tokenId The ID of the token being checked.
    /// @return True if the transaction is on the primary market
    function _isPrimaryMarketForBundledAsset(
        address nftSideAccount,
        address token,
        uint256 tokenId
    ) internal view returns (bool) {
        address creator;
        if (token.supportsInterface(type(IRoyaltyUGC).interfaceId)) {
            creator = IRoyaltyUGC(token).getCreatorAddress(tokenId);
        }
        return creator != address(0) && nftSideAccount == creator;
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
        (, address nftSideRecipient) = _getRecipients(paymentSide, nftSide);

        (address token, uint256 tokenId) = LibAsset.decodeToken(nftSide.asset.assetType);
        IRoyaltiesProvider.Part[] memory royalties = royaltiesRegistry.getRoyalties(token, tokenId);
        remainder = _applyRoyalties(remainder, paymentSide, remainder, royalties, nftSideRecipient);

        return remainder;
    }

    /// @notice Apply and transfer royalties based on the asset price and royalties information.
    /// @param remainder How much of the amount left after previous transfers
    /// @param paymentSide DealSide of the fee-side order
    /// @param assetPrice The price of the asset for which royalties are being calculated.
    /// @param royalties The array of royalty recipients and their respective basis points.
    /// @param recipient The recipient who will receive the remainder after royalties are deducted.
    /// @return How much left after paying royalties
    function _applyRoyalties(
        uint256 remainder,
        DealSide memory paymentSide,
        uint256 assetPrice,
        IRoyaltiesProvider.Part[] memory royalties,
        address recipient
    ) internal returns (uint256) {
        uint256 totalRoyalties;
        uint256 royaltiesLength = royalties.length;
        for (uint256 i; i < royaltiesLength; ++i) {
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
    /// @param assetPrice The price of the asset for which royalties are being calculated.
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
            uint256 bundledERC721Length = bundle.bundledERC721.length;
            uint256 bundledERC1155Length = bundle.bundledERC1155.length;
            uint256 quadsLength = bundle.quads.xs.length;
            if (bundledERC721Length > 0 || quadsLength > 0) require(asset.value == 1, "bundle value error");
            for (uint256 i; i < bundledERC721Length; ++i) {
                address token = bundle.bundledERC721[i].erc721Address;
                uint256 idLength = bundle.bundledERC721[i].ids.length;
                for (uint256 j; j < idLength; ++j) {
                    _transferERC721(token, from, to, bundle.bundledERC721[i].ids[j]);
                }
            }
            for (uint256 i; i < bundledERC1155Length; ++i) {
                address token = bundle.bundledERC1155[i].erc1155Address;
                uint256 idLength = bundle.bundledERC1155[i].ids.length;
                require(idLength == bundle.bundledERC1155[i].supplies.length, "ERC1155 array error");
                for (uint256 j; j < idLength; ++j) {
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

    /// @notice Function deciding if the fees are applied or not, to be overridden
    /// @param from Address to check
    function _mustSkipFees(address from) internal virtual returns (bool);

    /// @notice return the quadId given an index, size and coordinates
    /// @param i the index to be added to x,y to get row and column
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return tokenId of the quad
    function idInPath(uint256 i, uint256 size, uint256 x, uint256 y) internal pure returns (uint256) {
        unchecked {
            return (x + (i % size)) + (y + (i / size)) * GRID_SIZE;
        }
    }

    /// @notice Function deciding if the seller is a TSB seller, to be overridden
    /// @param from Address to check
    function _isTSBSeller(address from) internal virtual returns (bool);

    // slither-disable-next-line unused-state
    uint256[49] private __gap;
}
