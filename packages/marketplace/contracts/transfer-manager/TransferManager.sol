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
            _transferPayouts(right.asset.assetType, right.asset.value, right.from, left.payouts);
        } else if (feeSide == LibAsset.FeeSide.RIGHT) {
            _doTransfersWithFees(right, left);
            _transferPayouts(left.asset.assetType, left.asset.value, left.from, right.payouts);
        } else {
            _transferPayouts(left.asset.assetType, left.asset.value, left.from, right.payouts);
            _transferPayouts(right.asset.assetType, right.asset.value, right.from, left.payouts);
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
            rest = _transferRoyalties(
                paymentSide.asset.assetType,
                nftSide.asset.assetType,
                nftSide.payouts,
                rest,
                paymentSide.asset.value,
                paymentSide.from
            );

            LibPart.Part[] memory origin = new LibPart.Part[](1);
            origin[0].account = payable(defaultFeeReceiver);

            address creator = _getCreator(nftSide.asset.assetType);
            if (creator != address(0) && creator == nftSide.from) {
                origin[0].value = uint96(protocolFeePrimary);
            } else {
                origin[0].value = uint96(protocolFeeSecondary);
            }

            (rest, ) = _transferFees(
                paymentSide.asset.assetType,
                rest,
                paymentSide.asset.value,
                origin,
                paymentSide.from
            );
        }

        _transferPayouts(paymentSide.asset.assetType, rest, paymentSide.from, nftSide.payouts);
    }

    /// @notice transfer royalties. If there is only one royalties receiver and one address in payouts and they match,
    /// @dev nothing is transferred in this function
    /// @param paymentAssetType Asset Type which represents payment
    /// @param nftAssetType Asset Type which represents NFT to pay royalties for
    /// @param payouts Payouts to be made
    /// @param rest How much of the amount left after previous transfers
    /// @param amount total amount of asset that is going to be transferred
    /// @param from owner of the Asset to transfer
    /// @return How much left after transferring royalties
    function _transferRoyalties(
        LibAsset.AssetType memory paymentAssetType,
        LibAsset.AssetType memory nftAssetType,
        LibPart.Part[] memory payouts,
        uint256 rest,
        uint256 amount,
        address from
    ) internal returns (uint256) {
        LibPart.Part[] memory royalties = _getRoyaltiesByAssetType(nftAssetType);

        address creator = _getCreator(nftAssetType);
        if (creator != address(0) && payouts[0].account == creator) {
            require(royalties[0].value <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
            return rest;
        }
        if (royalties.length == 1 && royalties[0].account == payouts[0].account) {
            require(royalties[0].value <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
            return rest;
        }

        (uint256 result, uint256 totalRoyalties) = _transferFees(paymentAssetType, rest, amount, royalties, from);
        require(totalRoyalties <= ROYALTY_SHARE_LIMIT, "Royalties are too high (>50%)");
        return result;
    }

    /// @notice calculates royalties by asset type.
    /// @param nftAssetType NFT Asset Type to calculate royalties for
    /// @return calculated royalties (Array of LibPart.Part)
    function _getRoyaltiesByAssetType(LibAsset.AssetType memory nftAssetType) internal returns (LibPart.Part[] memory) {
        (address token, uint256 tokenId) = abi.decode(nftAssetType.data, (address, uint));
        return royaltiesRegistry.getRoyalties(token, tokenId);
    }

    /// @notice Transfer fees
    /// @param assetType Asset Type to transfer
    /// @param rest How much of the amount left after previous transfers
    /// @param amount Total amount of the Asset. Used as a base to calculate part from (100%)
    /// @param fees Array of LibPart.Part which represents fees to pay
    /// @param from owner of the Asset to transfer
    /// @return newRest how much left after transferring fees
    /// @return totalFees total number of fees in bp
    function _transferFees(
        LibAsset.AssetType memory assetType,
        uint256 rest,
        uint256 amount,
        LibPart.Part[] memory fees,
        address from
    ) internal returns (uint256 newRest, uint256 totalFees) {
        totalFees = 0;
        newRest = rest;
        for (uint256 i = 0; i < fees.length; ++i) {
            totalFees = totalFees + fees[i].value;
            uint256 feeValue;
            (newRest, feeValue) = _subFeeInBp(newRest, amount, fees[i].value);
            if (feeValue > 0) {
                transfer(LibAsset.Asset(assetType, feeValue), from, fees[i].account);
            }
        }
    }

    /// @notice transfers main part of the asset (payout)
    /// @param assetType Asset Type to transfer
    /// @param amount Amount of the asset to transfer
    /// @param from Current owner of the asset
    /// @param payouts List of payouts - receivers of the Asset
    function _transferPayouts(
        LibAsset.AssetType memory assetType,
        uint256 amount,
        address from,
        LibPart.Part[] memory payouts
    ) internal {
        transfer(LibAsset.Asset(assetType, amount), from, payouts[0].account);
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
        return _subFee(value, total.bp(feeInBp));
    }

    /// @notice subtract fee from value
    /// @param value from which the fees will be deducted
    /// @param fee to deduct from value
    /// @return newValue result from deduction, 0 if value < fee
    /// @return realFee fee value if value > fee, otherwise return value input
    function _subFee(uint256 value, uint256 fee) internal pure returns (uint256 newValue, uint256 realFee) {
        if (value > fee) {
            newValue = value - fee;
            realFee = fee;
        } else {
            newValue = 0;
            realFee = value;
        }
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
