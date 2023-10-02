// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {LibFill} from "./libraries/LibFill.sol";
import {IAssetMatcher} from "../interfaces/IAssetMatcher.sol";
import {TransferExecutor, LibTransfer} from "../transfer-manager/TransferExecutor.sol";
import {LibDeal, LibAsset} from "../transfer-manager/lib/LibDeal.sol";
import {LibFeeSide} from "../transfer-manager/lib/LibFeeSide.sol";
import {LibOrderDataGeneric, LibOrder} from "./libraries/LibOrderDataGeneric.sol";
import {ITransferManager} from "../transfer-manager/interfaces/ITransferManager.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";

/// @notice ExchangeCore contract
/// @dev contains the main functions for the marketplace
abstract contract ExchangeCore is Initializable, TransferExecutor, ITransferManager {
    using LibTransfer for address payable;

    // a list of left/right orders that match each other
    // left and right are symmetrical except for fees that are taken from left side first.
    struct ExchangeMatch {
        LibOrder.Order orderLeft; // left order
        bytes signatureLeft; // signature for the left order
        LibOrder.Order orderRight; // right order
        bytes signatureRight; // signature for the right order
    }

    /// @notice AssetMatcher contract
    /// @return AssetMatcher address
    IAssetMatcher public assetMatcher;

    /// @notice OrderValidator contract
    /// @return OrderValidator address
    IOrderValidator public orderValidator;

    uint256 private constant UINT256_MAX = type(uint256).max;

    /// @notice stores the fills for orders
    /// @return order fill
    mapping(bytes32 => uint256) public fills;

    /// @notice event signaling that an order was canceled
    /// @param  hash order hash
    event Cancel(bytes32 indexed hash);

    /*     /// @notice event when orders match
    /// @param from _msgSender
    /// @param leftHash left order hash
    /// @param rightHash right order hash
    /// @param newLeftFill fill for left order
    /// @param newRightFill fill for right order
    /// @param totalFillLeft total fill left
    /// @param totalFillRight total fill right */
    event Match(
        address indexed from,
        bytes32 leftHash,
        bytes32 rightHash,
        LibFill.FillResult newFill,
        uint256 totalFillLeft,
        uint256 totalFillRight,
        uint256 valueLeft,
        uint256 valueRight
    );
    event AssetMatcherSet(IAssetMatcher indexed contractAddress);
    event OrderValidatorSet(IOrderValidator indexed contractAddress);

    /// @notice initializer for ExchangeCore
    /// @param newOrderValidatorAddress new OrderValidator contract address
    /// @param newAssetMatcher new AssetMatcher contract address
    /// @dev initialize permissions for native token exchange
    // solhint-disable-next-line func-name-mixedcase
    function __ExchangeCoreInitialize(
        IOrderValidator newOrderValidatorAddress,
        IAssetMatcher newAssetMatcher
    ) internal onlyInitializing {
        _setOrderValidatorContract(newOrderValidatorAddress);
        _setAssetMatcherContract(newAssetMatcher);
    }

    /// @notice set AssetMatcher address
    /// @param contractAddress new AssetMatcher contract address
    /// @dev matches assets between left and right order
    function _setAssetMatcherContract(IAssetMatcher contractAddress) internal {
        require(address(contractAddress) != address(0), "invalid asset matcher");
        assetMatcher = contractAddress;
        emit AssetMatcherSet(contractAddress);
    }

    /// @notice set OrderValidator address
    /// @param contractAddress new OrderValidator contract address
    function _setOrderValidatorContract(IOrderValidator contractAddress) internal {
        require(address(contractAddress) != address(0), "invalid order validator");
        orderValidator = contractAddress;
        emit OrderValidatorSet(contractAddress);
    }

    /// @notice cancel order
    /// @param order to be canceled
    /// @param orderHash used as a checksum to avoid mistakes in the values of order
    /// @dev require msg sender to be order maker and salt different from 0
    function _cancel(LibOrder.Order calldata order, bytes32 orderHash) internal {
        require(order.salt != 0, "ExchangeCore: 0 salt can't be used");
        bytes32 orderKeyHash = LibOrder.hashKey(order);
        require(orderHash == orderKeyHash, "ExchangeCore: Invalid orderHash");
        fills[orderKeyHash] = UINT256_MAX;
        emit Cancel(orderKeyHash);
    }

    /// @notice Match orders and transact
    /// @param sender the original sender of the transaction
    /// @param matchedOrders a list of left/right orders that match each other
    /// @dev validate orders through validateOrders before matchAndTransfer
    function _matchOrders(address sender, ExchangeMatch[] calldata matchedOrders) internal {
        uint256 len = matchedOrders.length;
        require(len > 0, "invalid exchange match");
        for (uint256 i; i < len; i++) {
            ExchangeMatch calldata m = matchedOrders[i];
            _validateOrders(sender, m.orderLeft, m.signatureLeft, m.orderRight, m.signatureRight);
            _matchAndTransfer(sender, m.orderLeft, m.orderRight);
        }
    }

    /// @dev function, validate orders
    /// @param sender the message sender
    /// @param orderLeft left order
    /// @param signatureLeft order left signature
    /// @param orderRight right order
    /// @param signatureRight order right signature
    function _validateOrders(
        address sender,
        LibOrder.Order memory orderLeft,
        bytes memory signatureLeft,
        LibOrder.Order memory orderRight,
        bytes memory signatureRight
    ) internal view {
        orderValidator.validate(orderLeft, signatureLeft, sender);
        orderValidator.validate(orderRight, signatureRight, sender);
        if (orderLeft.taker != address(0)) {
            if (orderRight.maker != address(0)) require(orderRight.maker == orderLeft.taker, "leftOrder.taker failed");
        }
        if (orderRight.taker != address(0)) {
            if (orderLeft.maker != address(0)) require(orderRight.taker == orderLeft.maker, "rightOrder.taker failed");
        }
    }

    /// @notice matches valid orders and transfers their assets
    /// @param sender the message sender
    /// @param orderLeft the left order of the match
    /// @param orderRight the right order of the match
    function _matchAndTransfer(
        address sender,
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight
    ) internal {
        (LibAsset.AssetType memory makeMatch, LibAsset.AssetType memory takeMatch) = _matchAssets(
            orderLeft,
            orderRight
        );

        (
            LibOrderDataGeneric.GenericOrderData memory leftOrderData,
            LibOrderDataGeneric.GenericOrderData memory rightOrderData,
            LibFill.FillResult memory newFill
        ) = _parseOrdersSetFillEmitMatch(sender, orderLeft, orderRight);

        doTransfers(
            LibDeal.DealSide({
                asset: LibAsset.Asset({assetType: makeMatch, value: newFill.leftValue}),
                payouts: leftOrderData.payouts,
                from: orderLeft.maker
            }),
            LibDeal.DealSide({
                asset: LibAsset.Asset(takeMatch, newFill.rightValue),
                payouts: rightOrderData.payouts,
                from: orderRight.maker
            }),
            LibFeeSide.getFeeSide(makeMatch.assetClass, takeMatch.assetClass)
        );
    }

    /// @notice parse orders with LibOrderDataGeneric parse() to get the order data, then create a new fill with setFillEmitMatch()
    /// @param sender the message sender
    /// @param orderLeft left order
    /// @param orderRight right order
    /// @return leftOrderData generic order data from left order
    /// @return rightOrderData generic order data from right order
    /// @return newFill fill result
    function _parseOrdersSetFillEmitMatch(
        address sender,
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight
    )
        internal
        returns (
            LibOrderDataGeneric.GenericOrderData memory leftOrderData,
            LibOrderDataGeneric.GenericOrderData memory rightOrderData,
            LibFill.FillResult memory newFill
        )
    {
        bytes32 leftOrderKeyHash = LibOrder.hashKey(orderLeft);
        bytes32 rightOrderKeyHash = LibOrder.hashKey(orderRight);

        if (orderLeft.maker == address(0)) {
            orderLeft.maker = sender;
        }
        if (orderRight.maker == address(0)) {
            orderRight.maker = sender;
        }

        leftOrderData = LibOrderDataGeneric.parse(orderLeft);
        rightOrderData = LibOrderDataGeneric.parse(orderRight);

        newFill = _setFillEmitMatch(
            sender,
            orderLeft,
            orderRight,
            leftOrderKeyHash,
            rightOrderKeyHash,
            leftOrderData.isMakeFill,
            rightOrderData.isMakeFill
        );
    }

    ///    @notice calculates fills for the matched orders and set them in "fills" mapping
    ///    @param sender the message sender
    ///    @param orderLeft left order of the match
    ///    @param orderRight right order of the match
    ///    @param leftMakeFill true if the left orders uses make-side fills, false otherwise
    ///    @param rightMakeFill true if the right orders uses make-side fills, false otherwise
    ///    @return newFill returns change in orders' fills by the match
    function _setFillEmitMatch(
        address sender,
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight,
        bytes32 leftOrderKeyHash,
        bytes32 rightOrderKeyHash,
        bool leftMakeFill,
        bool rightMakeFill
    ) internal returns (LibFill.FillResult memory newFill) {
        uint256 leftOrderFill = _getOrderFill(orderLeft.salt, leftOrderKeyHash);
        uint256 rightOrderFill = _getOrderFill(orderRight.salt, rightOrderKeyHash);
        newFill = LibFill.fillOrder(orderLeft, orderRight, leftOrderFill, rightOrderFill, leftMakeFill, rightMakeFill);

        require(newFill.rightValue > 0 && newFill.leftValue > 0, "nothing to fill");

        if (orderLeft.salt != 0) {
            if (leftMakeFill) {
                fills[leftOrderKeyHash] = leftOrderFill + newFill.leftValue;
            } else {
                fills[leftOrderKeyHash] = leftOrderFill + newFill.rightValue;
            }
        }

        if (orderRight.salt != 0) {
            if (rightMakeFill) {
                fills[rightOrderKeyHash] = rightOrderFill + newFill.rightValue;
            } else {
                fills[rightOrderKeyHash] = rightOrderFill + newFill.leftValue;
            }
        }

        emit Match({
            from: sender,
            leftHash: leftOrderKeyHash,
            rightHash: rightOrderKeyHash,
            newFill: newFill,
            totalFillLeft: fills[leftOrderKeyHash],
            totalFillRight: fills[rightOrderKeyHash],
            valueLeft: orderLeft.makeAsset.value,
            valueRight: orderRight.makeAsset.value
        });
        return newFill;
    }

    /// @notice return fill corresponding to order hash
    /// @param salt if salt 0, fill = 0
    /// @param hash order hash
    function _getOrderFill(uint256 salt, bytes32 hash) internal view returns (uint256 fill) {
        if (salt == 0) {
            fill = 0;
        } else {
            fill = fills[hash];
        }
    }

    /// @notice match assets from orders
    /// @param orderLeft left order
    /// @param orderRight right order
    /// @dev each make asset must correrspond to the other take asset and be different from 0
    function _matchAssets(
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight
    ) internal view returns (LibAsset.AssetType memory makeMatch, LibAsset.AssetType memory takeMatch) {
        makeMatch = assetMatcher.matchAssets(orderLeft.makeAsset.assetType, orderRight.takeAsset.assetType);
        require(makeMatch.assetClass != LibAsset.AssetClassType.INVALID_ASSET_CLASS, "assets don't match");
        takeMatch = assetMatcher.matchAssets(orderLeft.takeAsset.assetType, orderRight.makeAsset.assetType);
        require(takeMatch.assetClass != LibAsset.AssetClassType.INVALID_ASSET_CLASS, "assets don't match");
    }

    uint256[49] private __gap;
}
