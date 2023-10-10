// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";
import {IRoyaltyUGC} from "./interfaces/IRoyaltyUGC.sol";
import {ITransferManager} from "./interfaces/ITransferManager.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";
import {LibPart} from "../lib-part/LibPart.sol";

/// @title TransferManager contract
/// @notice responsible for transferring all Assets
/// @dev this manager supports different types of fees
/// @dev also it supports different beneficiaries
abstract contract TransferManager is ERC165Upgradeable, ITransferManager {
    bytes4 internal constant INTERFACE_ID_IROYALTYUGC = 0xa30b4db9;
    uint256 internal constant PROTOCOL_FEE_SHARE_LIMIT = 5000;
    uint256 internal constant ROYALTY_SHARE_LIMIT = 5000;

    /// @notice fee for primary sales
    /// @return uint256 of primary sale fee
    uint256 public protocolFeePrimary;

    /// @notice fee for secondary sales
    /// @return uint256 of secondary sale fee
    uint256 public protocolFeeSecondary;

    /// @notice Registry for the different royalties
    /// @return address of royaltiesRegistry
    IRoyaltiesProvider public royaltiesRegistry;

    /// @notice Default receiver of protocol fees
    /// @return address of defaultFeeReceiver
    address public defaultFeeReceiver;

    /// @notice event for when protocol fees are set
    /// @param newProtocolFeePrimary fee for primary market
    /// @param newProtocolFeeSecondary fee for secondary market
    event ProtocolFeeSet(uint256 newProtocolFeePrimary, uint256 newProtocolFeeSecondary);

    /// @notice event for when a royalties registry is set
    /// @param newRoyaltiesRegistry address of new royalties registry
    event RoyaltiesRegistrySet(IRoyaltiesProvider newRoyaltiesRegistry);

    /// @notice event for when a default fee receiver is set
    /// @param newDefaultFeeReceiver address that gets the fees
    event DefaultFeeReceiverSet(address newDefaultFeeReceiver);

    /// @notice initializer for TransferExecutor
    /// @param newProtocolFeePrimary fee for primary market
    /// @param newProtocolFeeSecondary fee for secondary market
    /// @param newDefaultFeeReceiver address for account receiving fees
    /// @param newRoyaltiesProvider address of royalties registry
    // solhint-disable-next-line func-name-mixedcase
    function __TransferManager_init_unchained(
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider
    ) internal onlyInitializing {
        __ERC165_init();
        _setProtocolFee(newProtocolFeePrimary, newProtocolFeeSecondary);
        _setRoyaltiesRegistry(newRoyaltiesProvider);
        _setDefaultFeeReceiver(newDefaultFeeReceiver);
    }

    /// @notice executes transfers for 2 matched orders
    /// @param left DealSide from the left order (see LibDeal.sol)
    /// @param right DealSide from the right order (see LibDeal.sol)
    /// @dev this is the main entry point, when used as a separated contract this method will be external
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
        transfer(nftSide.asset, nftSide.account, paymentSide.account);
        // Transfer ERC20 or right side if FeeSide.NONE
        if (feeSide == LibAsset.FeeSide.NONE || !_applyFees(paymentSide.account)) {
            transfer(paymentSide.asset, paymentSide.account, nftSide.account);
        } else {
            _doTransfersWithFeesAndRoyalties(paymentSide, nftSide);
        }
    }

    /// @notice setter for royalty registry
    /// @param newRoyaltiesRegistry address of new royalties registry
    function _setRoyaltiesRegistry(IRoyaltiesProvider newRoyaltiesRegistry) internal {
        require(address(newRoyaltiesRegistry) != address(0), "invalid Royalties Registry");
        royaltiesRegistry = newRoyaltiesRegistry;

        emit RoyaltiesRegistrySet(newRoyaltiesRegistry);
    }

    /// @notice setter for protocol fees
    /// @param newProtocolFeePrimary fee for primary market
    /// @param newProtocolFeeSecondary fee for secondary market
    function _setProtocolFee(uint256 newProtocolFeePrimary, uint256 newProtocolFeeSecondary) internal {
        require(newProtocolFeePrimary < PROTOCOL_FEE_SHARE_LIMIT, "invalid primary fee");
        require(newProtocolFeeSecondary < PROTOCOL_FEE_SHARE_LIMIT, "invalid secondary fee");
        protocolFeePrimary = newProtocolFeePrimary;
        protocolFeeSecondary = newProtocolFeeSecondary;

        emit ProtocolFeeSet(newProtocolFeePrimary, newProtocolFeeSecondary);
    }

    /// @notice setter for default fee receiver
    /// @param newDefaultFeeReceiver address that gets the fees
    function _setDefaultFeeReceiver(address newDefaultFeeReceiver) internal {
        require(address(newDefaultFeeReceiver) != address(0), "invalid default fee receiver");
        defaultFeeReceiver = newDefaultFeeReceiver;

        emit DefaultFeeReceiverSet(newDefaultFeeReceiver);
    }

    /// @notice transfer protocol fees and royalties.
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
            remainder = _transferPercentage(remainder, paymentSide, defaultFeeReceiver, fees);
        }
        if (remainder > 0) {
            transfer(LibAsset.Asset(paymentSide.asset.assetType, remainder), paymentSide.account, nftSide.account);
        }
    }

    /// @notice return if this tx is on primary market
    /// @param nftSide DealSide of the nft-side order
    /// @return creator address or zero if is not able to retrieve it
    function _isPrimaryMarket(DealSide memory nftSide) internal view returns (bool) {
        address creator = _getCreator(nftSide.asset.assetType);
        return creator != address(0) && nftSide.account == creator;
    }

    /// @notice transfer royalties.
    /// @param remainder How much of the amount left after previous transfers
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    /// @return How much left after paying royalties
    function _transferRoyalties(
        uint256 remainder,
        DealSide memory paymentSide,
        DealSide memory nftSide
    ) internal returns (uint256) {
        LibPart.Part[] memory royalties = _getRoyaltiesByAssetType(nftSide.asset.assetType);
        uint256 totalRoyalties;
        uint256 len = royalties.length;
        for (uint256 i; i < len; i++) {
            LibPart.Part memory r = royalties[i];
            totalRoyalties = totalRoyalties + r.value;
            if (r.account == nftSide.account) {
                // We just skip the transfer because the nftSide will get the full payment anyway.
                continue;
            }
            remainder = _transferPercentage(remainder, paymentSide, r.account, r.value);
        }
        require(totalRoyalties <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
        return remainder;
    }

    /// @notice do a transfer based on a percentage (in base points)
    /// @param remainder How much of the amount left after previous transfers
    /// @param paymentSide DealSide of the fee-side order
    /// @param to account that will receive the asset
    /// @param percentageInBp percentage to be transferred in base points
    /// @return How much left after current transfer
    function _transferPercentage(
        uint256 remainder,
        DealSide memory paymentSide,
        address to,
        uint256 percentageInBp
    ) internal returns (uint256) {
        LibAsset.Asset memory payment = LibAsset.Asset(paymentSide.asset.assetType, 0);
        (remainder, payment.value) = _subFeeInBp(remainder, paymentSide.asset.value, percentageInBp);
        if (payment.value > 0) {
            transfer(payment, paymentSide.account, to);
        }
        return remainder;
    }

    /// @notice subtract fees in BP, or base point
    /// @param remainder amount left from amount after fees are discounted
    /// @param total total price for asset
    /// @param percentageInBp fee in base points to be deducted
    /// @return newValue remainder after fee subtraction
    /// @return realFee fee value (not percentage)
    function _subFeeInBp(
        uint256 remainder,
        uint256 total,
        uint256 percentageInBp
    ) internal pure returns (uint256 newValue, uint256 realFee) {
        uint256 fee = (total * percentageInBp) / 10000;
        if (remainder > fee) {
            return (remainder - fee, fee);
        }
        return (0, remainder);
    }

    /// @notice calculates royalties by asset type.
    /// @param nftAssetType NFT Asset Type to calculate royalties for
    /// @return calculated royalties (Array of LibPart.Part)
    function _getRoyaltiesByAssetType(LibAsset.AssetType memory nftAssetType) internal returns (LibPart.Part[] memory) {
        (address token, uint256 tokenId) = abi.decode(nftAssetType.data, (address, uint));
        return royaltiesRegistry.getRoyalties(token, tokenId);
    }

    /// @notice return the creator of the token if the token supports INTERFACE_ID_IROYALTYUGC
    /// @param assetType asset type
    /// @return creator address or zero if is not able to retrieve it
    function _getCreator(LibAsset.AssetType memory assetType) internal view returns (address creator) {
        (address token, uint256 tokenId) = abi.decode(assetType.data, (address, uint));
        try IERC165Upgradeable(token).supportsInterface(INTERFACE_ID_IROYALTYUGC) returns (bool result) {
            if (result) {
                creator = IRoyaltyUGC(token).getCreatorAddress(tokenId);
            }
            // solhint-disable-next-line no-empty-blocks
        } catch {}
    }

    /// @notice function deciding if the fees are applied or not, to be overriden
    /// @param from address to check
    function _applyFees(address from) internal virtual returns (bool);

    uint256[46] private __gap;
}
