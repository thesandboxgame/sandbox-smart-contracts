// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC165CheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IRoyaltyUGC} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IRoyaltyUGC.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IRoyaltiesProvider, TOTAL_BASIS_POINTS} from "./interfaces/IRoyaltiesProvider.sol";
import {ITransferManager} from "./interfaces/ITransferManager.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @author The Sandbox
/// @title TransferManager
/// @notice Manages the transfer of assets with support for different fee structures and beneficiaries.
/// @dev This contract can handle various assets like ERC20, ERC721, and ERC1155 tokens.
abstract contract TransferManager is Initializable, ITransferManager {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

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

        (address paymentSideRecipient, address nftSideRecipient) = _getRecipients(paymentSide, nftSide);

        // Transfer NFT or left side if FeeSide.NONE
        _transfer(nftSide.asset, nftSide.account, paymentSideRecipient);
        // Transfer ERC20 or right side if FeeSide.NONE
        if (feeSide == LibAsset.FeeSide.NONE || _mustSkipFees(paymentSide.account)) {
            _transfer(paymentSide.asset, paymentSide.account, nftSideRecipient);
        } else {
            _doTransfersWithFeesAndRoyalties(paymentSide, nftSide);
        }
    }

    /// @notice Sets the royalties registry.
    /// @param newRoyaltiesRegistry Address of new royalties registry
    function _setRoyaltiesRegistry(IRoyaltiesProvider newRoyaltiesRegistry) internal {
        require(address(newRoyaltiesRegistry).isContract(), "invalid Royalties Registry");
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
        uint256 fees;
        uint256 remainder = paymentSide.asset.value;
        if (_isPrimaryMarket(nftSide)) {
            fees = protocolFeePrimary;
            // No royalties
        } else {
            fees = protocolFeeSecondary;
            remainder = _transferRoyalties(remainder, paymentSide, nftSide);
        }
        if (fees > 0 && remainder > 0) {
            remainder = _transferPercentage(remainder, paymentSide, defaultFeeReceiver, fees, PROTOCOL_FEE_MULTIPLIER);
        }
        if (remainder > 0) {
            (, address nftSideRecipient) = _getRecipients(paymentSide, nftSide);
            _transfer(LibAsset.Asset(paymentSide.asset.assetType, remainder), paymentSide.account, nftSideRecipient);
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
        (address token, uint256 tokenId) = LibAsset.decodeToken(nftSide.asset.assetType);
        (, address nftSideRecipient) = _getRecipients(paymentSide, nftSide);
        IRoyaltiesProvider.Part[] memory royalties = royaltiesRegistry.getRoyalties(token, tokenId);
        uint256 totalRoyalties;
        uint256 len = royalties.length;
        for (uint256 i; i < len; i++) {
            IRoyaltiesProvider.Part memory r = royalties[i];
            totalRoyalties = totalRoyalties + r.basisPoints;
            if (r.account == nftSideRecipient) {
                // We just skip the transfer because the nftSide will get the full payment anyway.
                continue;
            }
            remainder = _transferPercentage(remainder, paymentSide, r.account, r.basisPoints, TOTAL_BASIS_POINTS);
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
        address to,
        uint256 percentage,
        uint256 multiplier
    ) internal returns (uint256) {
        LibAsset.Asset memory payment = LibAsset.Asset(paymentSide.asset.assetType, 0);
        uint256 fee = (paymentSide.asset.value * percentage) / multiplier;
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
            SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(token), from, to, asset.value);
        } else if (asset.assetType.assetClass == LibAsset.AssetClass.ERC721) {
            (address token, uint256 tokenId) = LibAsset.decodeToken(asset.assetType);
            require(asset.value == 1, "erc721 value error");
            IERC721Upgradeable(token).safeTransferFrom(from, to, tokenId);
        } else if (asset.assetType.assetClass == LibAsset.AssetClass.ERC1155) {
            (address token, uint256 tokenId) = LibAsset.decodeToken(asset.assetType);
            IERC1155Upgradeable(token).safeTransferFrom(from, to, tokenId, asset.value, "");
        } else {
            revert("invalid asset class");
        }
    }

    /// @notice Function deciding if the fees are applied or not, to be override
    /// @param from Address to check
    function _mustSkipFees(address from) internal virtual returns (bool);

    // slither-disable-next-line unused-state
    uint256[50] private __gap;
}
