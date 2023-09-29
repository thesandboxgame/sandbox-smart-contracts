// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ERC165Upgradeable, IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {LibERC721LazyMint} from "../lazy-mint/erc-721/LibERC721LazyMint.sol";
import {LibERC1155LazyMint} from "../lazy-mint/erc-1155/LibERC1155LazyMint.sol";
import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";
import {BpLibrary} from "../lib-bp/BpLibrary.sol";
import {IRoyaltyUGC} from "./interfaces/IRoyaltyUGC.sol";
import {ITransferManager, LibDeal, LibFeeSide} from "./interfaces/ITransferManager.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";
import {LibPart} from "../lib-part/LibPart.sol";

/// @title TransferManager contract
/// @notice responsible for transferring all Assets
/// @dev this manager supports different types of fees
/// @dev also it supports different beneficiaries
abstract contract TransferManager is ERC165Upgradeable, ITransferManager {
    using BpLibrary for uint;

    bytes4 internal constant INTERFACE_ID_IROYALTYUGC = 0xa30b4db9;

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
    ) internal {
        _setProtocolFee(newProtocolFeePrimary, newProtocolFeeSecondary);
        _setRoyaltiesRegistry(newRoyaltiesProvider);
        _setDefaultFeeReceiver(newDefaultFeeReceiver);
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
        require(newProtocolFeePrimary < 5000, "invalid primary fee");
        require(newProtocolFeeSecondary < 5000, "invalid secodary fee");
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

    /// @notice executes transfers for 2 matched orders
    /// @param left DealSide from the left order (see LibDeal.sol)
    /// @param right DealSide from the right order (see LibDeal.sol)
    /// @return totalLeftValue - total amount for the left order
    /// @return totalRightValue - total amount for the right order
    function doTransfers(
        LibDeal.DealSide memory left,
        LibDeal.DealSide memory right,
        LibFeeSide.FeeSide feeSide
    ) internal override returns (uint256 totalLeftValue, uint256 totalRightValue) {
        totalLeftValue = left.asset.value;
        totalRightValue = right.asset.value;
        if (feeSide == LibFeeSide.FeeSide.LEFT) {
            totalLeftValue = doTransfersWithRoyalties(left, right);
            transferPayouts(right.asset.assetType, right.asset.value, right.from, left.payouts);
        } else if (feeSide == LibFeeSide.FeeSide.RIGHT) {
            totalRightValue = doTransfersWithRoyalties(right, left);
            transferPayouts(left.asset.assetType, left.asset.value, left.from, right.payouts);
        } else {
            transferPayouts(left.asset.assetType, left.asset.value, left.from, right.payouts);
            transferPayouts(right.asset.assetType, right.asset.value, right.from, left.payouts);
        }
    }

    /// @notice executes the fee-side transfers (payment + fees)
    /// @param paymentSide DealSide of the fee-side order
    /// @param nftSide DealSide of the nft-side order
    /// @return totalAmount of fee-side asset
    function doTransfersWithRoyalties(
        LibDeal.DealSide memory paymentSide,
        LibDeal.DealSide memory nftSide
    ) internal returns (uint256 totalAmount) {
        uint256 rest = paymentSide.asset.value;

        rest = transferRoyalties(
            paymentSide.asset.assetType,
            nftSide.asset.assetType,
            nftSide.payouts,
            rest,
            paymentSide.asset.value,
            paymentSide.from
        );

        LibPart.Part[] memory origin = new LibPart.Part[](1);
        origin[0].account = payable(defaultFeeReceiver);

        bool primaryMarket = false;

        // check if primary or secondary market
        if (
            nftSide.asset.assetType.assetClass == LibAsset.ERC1155_ASSET_CLASS ||
            nftSide.asset.assetType.assetClass == LibAsset.ERC721_ASSET_CLASS
        ) {
            (address token, uint256 tokenId) = abi.decode(nftSide.asset.assetType.data, (address, uint));
            try IERC165Upgradeable(token).supportsInterface(INTERFACE_ID_IROYALTYUGC) returns (bool result) {
                if (result) {
                    address creator = IRoyaltyUGC(token).getCreatorAddress(tokenId);
                    if (nftSide.from == creator) {
                        primaryMarket = true;
                    }
                }
                // solhint-disable-next-line no-empty-blocks
            } catch {}
        }

        if (primaryMarket) {
            origin[0].value = uint96(protocolFeePrimary);
        } else {
            origin[0].value = uint96(protocolFeeSecondary);
        }

        (rest, ) = transferFees(paymentSide.asset.assetType, rest, paymentSide.asset.value, origin, paymentSide.from);

        transferPayouts(paymentSide.asset.assetType, rest, paymentSide.from, nftSide.payouts);
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
    function transferRoyalties(
        LibAsset.AssetType memory paymentAssetType,
        LibAsset.AssetType memory nftAssetType,
        LibPart.Part[] memory payouts,
        uint256 rest,
        uint256 amount,
        address from
    ) internal returns (uint256) {
        LibPart.Part[] memory royalties = getRoyaltiesByAssetType(nftAssetType);

        if (
            nftAssetType.assetClass == LibAsset.ERC1155_ASSET_CLASS ||
            nftAssetType.assetClass == LibAsset.ERC721_ASSET_CLASS
        ) {
            (address token, uint256 tokenId) = abi.decode(nftAssetType.data, (address, uint));
            try IERC165Upgradeable(token).supportsInterface(INTERFACE_ID_IROYALTYUGC) returns (bool resultInterface) {
                if (resultInterface) {
                    address creator = IRoyaltyUGC(token).getCreatorAddress(tokenId);
                    if (payouts.length == 1 && payouts[0].account == creator) {
                        require(royalties[0].value <= 5000, "Royalties are too high (>50%)");
                        return rest;
                    }
                }
                // solhint-disable-next-line no-empty-blocks
            } catch {}
        }
        if (royalties.length == 1 && payouts.length == 1 && royalties[0].account == payouts[0].account) {
            require(royalties[0].value <= 5000, "Royalties are too high (>50%)");
            return rest;
        }

        (uint256 result, uint256 totalRoyalties) = transferFees(paymentAssetType, rest, amount, royalties, from);
        require(totalRoyalties <= 5000, "Royalties are too high (>50%)");
        return result;
    }

    /// @notice calculates royalties by asset type. If it's a lazy NFT, then royalties are extracted from asset. otherwise using royaltiesRegistry
    /// @param nftAssetType NFT Asset Type to calculate royalties for
    /// @return calculated royalties (Array of LibPart.Part)
    function getRoyaltiesByAssetType(LibAsset.AssetType memory nftAssetType) internal returns (LibPart.Part[] memory) {
        if (
            nftAssetType.assetClass == LibAsset.ERC1155_ASSET_CLASS ||
            nftAssetType.assetClass == LibAsset.ERC721_ASSET_CLASS
        ) {
            (address token, uint256 tokenId) = abi.decode(nftAssetType.data, (address, uint));
            return royaltiesRegistry.getRoyalties(token, tokenId);
        } else if (nftAssetType.assetClass == LibERC1155LazyMint.ERC1155_LAZY_ASSET_CLASS) {
            (, LibERC1155LazyMint.Mint1155Data memory data) = abi.decode(
                nftAssetType.data,
                (address, LibERC1155LazyMint.Mint1155Data)
            );
            return data.royalties;
        } else if (nftAssetType.assetClass == LibERC721LazyMint.ERC721_LAZY_ASSET_CLASS) {
            (, LibERC721LazyMint.Mint721Data memory data) = abi.decode(
                nftAssetType.data,
                (address, LibERC721LazyMint.Mint721Data)
            );
            return data.royalties;
        }
        LibPart.Part[] memory empty;
        return empty;
    }

    /// @notice Transfer fees
    /// @param assetType Asset Type to transfer
    /// @param rest How much of the amount left after previous transfers
    /// @param amount Total amount of the Asset. Used as a base to calculate part from (100%)
    /// @param fees Array of LibPart.Part which represents fees to pay
    /// @param from owner of the Asset to transfer
    /// @return newRest how much left after transferring fees
    /// @return totalFees total number of fees in bp
    function transferFees(
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
            (newRest, feeValue) = subFeeInBp(newRest, amount, fees[i].value);
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
    function transferPayouts(
        LibAsset.AssetType memory assetType,
        uint256 amount,
        address from,
        LibPart.Part[] memory payouts
    ) internal {
        require(payouts.length > 0, "transferPayouts: nothing to transfer");
        uint256 sumBps = 0;
        uint256 rest = amount;
        for (uint256 i = 0; i < payouts.length - 1; ++i) {
            uint256 currentAmount = amount.bp(payouts[i].value);
            sumBps = sumBps + payouts[i].value;
            if (currentAmount > 0) {
                rest = rest - currentAmount;
                transfer(LibAsset.Asset(assetType, currentAmount), from, payouts[i].account);
            }
        }
        LibPart.Part memory lastPayout = payouts[payouts.length - 1];
        sumBps = sumBps + lastPayout.value;
        require(sumBps == 10000, "Sum payouts Bps not equal 100%");
        if (rest > 0) {
            transfer(LibAsset.Asset(assetType, rest), from, lastPayout.account);
        }
    }

    /// @notice subtract fees in BP, or base point
    /// @param value amount left from amount after fees are discounted
    /// @param total total price for asset
    /// @param feeInBp fee in basepoint to be deducted
    function subFeeInBp(
        uint256 value,
        uint256 total,
        uint256 feeInBp
    ) internal pure returns (uint256 newValue, uint256 realFee) {
        return subFee(value, total.bp(feeInBp));
    }

    /// @notice subtract fee from value
    /// @param value from which the fees will be deducted
    /// @param fee to deduct from value
    /// @return newValue result from deduction, 0 if value < fee
    /// @return realFee fee value if value > fee, otherwise return value input
    function subFee(uint256 value, uint256 fee) internal pure returns (uint256 newValue, uint256 realFee) {
        if (value > fee) {
            newValue = value - fee;
            realFee = fee;
        } else {
            newValue = 0;
            realFee = value;
        }
    }

    uint256[46] private __gap;
}
