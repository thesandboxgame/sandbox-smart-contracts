// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";
import {BpLibrary} from "../lib-bp/BpLibrary.sol";
import {IRoyaltyUGC} from "./interfaces/IRoyaltyUGC.sol";
import {ITransferManager} from "./interfaces/ITransferManager.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";
import {LibPart} from "../lib-part/LibPart.sol";

/// @title TransferManager contract
/// @notice responsible for transferring all Assets
/// @dev this manager supports different types of fees
/// @dev also it supports different beneficiaries
abstract contract TransferManager is ERC165Upgradeable, ITransferManager {
    using BpLibrary for uint;

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
        if (feeSide == LibAsset.FeeSide.LEFT) {
            _doTransfersWithFees(left, right);
            transfer(right.asset, right.from, left.to);
        } else if (feeSide == LibAsset.FeeSide.RIGHT) {
            _doTransfersWithFees(right, left);
            transfer(left.asset, left.from, right.to);
        } else {
            transfer(left.asset, left.from, right.to);
            transfer(right.asset, right.from, left.to);
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

    /// @notice executes the fee-side transfers (payment + fees)
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    function _doTransfersWithFees(DealSide memory paymentSide, DealSide memory nftSide) internal {
        uint256 rest = paymentSide.asset.value;
        if (_applyFees(paymentSide.from)) {
            rest = _transferRoyalties(paymentSide, nftSide, rest);
            rest = _transferFees(paymentSide, nftSide, rest);
        }
        transfer(LibAsset.Asset(paymentSide.asset.assetType, rest), paymentSide.from, nftSide.to);
    }

    /// @notice transfer royalties. If there is only one royalties receiver and one address in payouts and they match.
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    /// @param rest How much of the amount left after previous transfers
    /// @return How much left after paying fees
    function _transferRoyalties(
        DealSide memory paymentSide,
        DealSide memory nftSide,
        uint256 rest
    ) internal returns (uint256) {
        LibPart.Part[] memory royalties = _getRoyaltiesByAssetType(nftSide.asset.assetType);
        uint256 len = royalties.length;
        address creator = _getCreator(nftSide.asset.assetType);

        // When the creator buys his own tokens he doesn't pay royalties to anybody.
        if (creator != address(0) && nftSide.to == creator) {
            require(royalties[0].value <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
            return rest;
        }

        // This is an optimization to avoid doing two transfers
        // in the case that the buyer has royalties over the token he is buying in this tx.
        if (len == 1 && royalties[0].account == nftSide.to) {
            require(royalties[0].value <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
            return rest;
        }

        uint256 totalRoyalties;
        LibAsset.Asset memory payment = LibAsset.Asset(paymentSide.asset.assetType, 0);
        for (uint256 i; i < len; i++) {
            LibPart.Part memory r = royalties[i];
            totalRoyalties = totalRoyalties + r.value;
            (rest, payment.value) = _subFeeInBp(rest, paymentSide.asset.value, r.value);
            if (payment.value > 0) {
                transfer(payment, paymentSide.from, r.account);
            }
        }

        require(totalRoyalties <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
        return rest;
    }

    /// @notice Transfer fees
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    /// @param rest How much of the amount left after previous transfers
    /// @return How much left after paying fees
    function _transferFees(
        DealSide memory paymentSide,
        DealSide memory nftSide,
        uint256 rest
    ) internal returns (uint256) {
        LibAsset.Asset memory payment = LibAsset.Asset(paymentSide.asset.assetType, 0);
        (rest, payment.value) = _subFeeInBp(rest, paymentSide.asset.value, _getProtocolFeesBP(nftSide));
        if (payment.value > 0) {
            transfer(payment, paymentSide.from, defaultFeeReceiver);
        }
        return rest;
    }

    /// @notice calculates royalties by asset type.
    /// @param nftAssetType NFT Asset Type to calculate royalties for
    /// @return calculated royalties (Array of LibPart.Part)
    function _getRoyaltiesByAssetType(LibAsset.AssetType memory nftAssetType) internal returns (LibPart.Part[] memory) {
        (address token, uint256 tokenId) = abi.decode(nftAssetType.data, (address, uint));
        return royaltiesRegistry.getRoyalties(token, tokenId);
    }

    /// @notice subtract fees in BP, or base point
    /// @param value amount left from amount after fees are discounted
    /// @param total total price for asset
    /// @param feeInBp fee in basepoint to be deducted
    function _subFeeInBp(
        uint256 value,
        uint256 total,
        uint256 feeInBp
    ) internal pure returns (uint256 newValue, uint256 realFee) {
        uint256 fee = total.bp(feeInBp);
        if (value > fee) {
            newValue = value - fee;
            realFee = fee;
        } else {
            newValue = 0;
            realFee = value;
        }
    }

    /// @notice return protocol fee depending if it is primary or secondary market
    /// @param nftSide DealSide of the nft-side order
    /// @return the protocol fee percent in base points
    function _getProtocolFeesBP(DealSide memory nftSide) internal view returns (uint256) {
        address creator = _getCreator(nftSide.asset.assetType);
        if (creator != address(0) && creator == nftSide.from) {
            return protocolFeePrimary;
        }
        return protocolFeeSecondary;
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
