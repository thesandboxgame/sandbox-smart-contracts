// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {LibFill} from "./libraries/LibFill.sol";
import {TransferExecutor} from "../transfer-manager/TransferExecutor.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";
import {LibOrder} from "../lib-order/LibOrder.sol";
import {LibPart} from "../lib-part/LibPart.sol";
import {ITransferManager} from "../transfer-manager/interfaces/ITransferManager.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";

/// @notice ExchangeCore contract
/// @dev contains the main functions for the marketplace
abstract contract ExchangeCore is Initializable, TransferExecutor, ITransferManager {
    // a list of left/right orders that match each other
    // left and right are symmetrical except for fees that are taken from left side first.
    struct ExchangeMatch {
        LibOrder.Order orderLeft; // left order
        bytes signatureLeft; // signature for the left order
        LibOrder.Order orderRight; // right order
        bytes signatureRight; // signature for the right order
    }

    /// @notice OrderValidator contract
    /// @return OrderValidator address
    IOrderValidator public orderValidator;

    uint256 private constant UINT256_MAX = type(uint256).max;
    uint256 private transferMax;

    /// @notice stores the fills for orders
    /// @return order fill
    mapping(bytes32 => uint256) public fills;

    /// @notice event signaling that an order was canceled
    /// @param  orderKeyHash order hash
    event Cancel(bytes32 indexed orderKeyHash, LibOrder.Order order);

    /// @notice event when orders match
    /// @param from _msgSender or operator if used with approve and call
    /// @param leftHash left order hash
    /// @param rightHash right order hash
    /// @param newFill fill for left order
    /// @param totalFillLeft total fill left
    /// @param totalFillRight total fill right
    /// @param valueLeft asset value for left order
    /// @param valueRight asset value for right order
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
    event OrderValidatorSet(IOrderValidator indexed contractAddress);

    /// @notice event for setting new maximum for transfers
    /// @param newMaxTransferValue new maximum
    event MaxTransferSet(uint256 newMaxTransferValue);

    /// @notice initializer for ExchangeCore
    /// @param newOrderValidatorAddress new OrderValidator contract address
    /// @param maxTransfer max number of transfers
    /// @dev initialize permissions for native token exchange
    // solhint-disable-next-line func-name-mixedcase
    function __ExchangeCoreInitialize(
        IOrderValidator newOrderValidatorAddress,
        uint256 maxTransfer
    ) internal onlyInitializing {
        _setOrderValidatorContract(newOrderValidatorAddress);
        _setMaxTransferValue(maxTransfer);
    }

    /// @notice set OrderValidator address
    /// @param contractAddress new OrderValidator contract address
    function _setOrderValidatorContract(IOrderValidator contractAddress) internal {
        require(address(contractAddress) != address(0), "invalid order validator");
        orderValidator = contractAddress;
        emit OrderValidatorSet(contractAddress);
    }

    /// @notice setter for max transfer value
    /// @param maxTransfer new vaue of max transfers
    function _setMaxTransferValue(uint256 maxTransfer) internal {
        transferMax = maxTransfer;
        emit MaxTransferSet(transferMax);
    }

    /// @notice cancel order
    /// @param order to be canceled
    /// @param orderKeyHash used as a checksum to avoid mistakes in the values of order
    /// @dev require msg sender to be order maker and salt different from 0
    function _cancel(LibOrder.Order calldata order, bytes32 orderKeyHash) internal {
        require(order.salt != 0, "0 salt can't be used");
        bytes32 _orderKeyHash = LibOrder.hashKey(order);
        require(_orderKeyHash == orderKeyHash, "Invalid orderHash");
        fills[orderKeyHash] = UINT256_MAX;
        emit Cancel(orderKeyHash, order);
    }

    /// @notice Match orders and transact
    /// @param sender the original sender of the transaction
    /// @param matchedOrders a list of left/right orders that match each other
    /// @dev validate orders through validateOrders before matchAndTransfer
    function _matchOrders(address sender, ExchangeMatch[] calldata matchedOrders) internal {
        uint256 len = matchedOrders.length;
        require(len > 0 && len < transferMax, "invalid exchange match quantities");
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
        // validate must force order.maker != address(0)
        orderValidator.validate(orderLeft, signatureLeft, sender);
        orderValidator.validate(orderRight, signatureRight, sender);
        if (orderLeft.taker != address(0)) {
            require(orderRight.maker == orderLeft.taker, "leftOrder.taker failed");
        }
        if (orderRight.taker != address(0)) {
            require(orderRight.taker == orderLeft.maker, "rightOrder.taker failed");
        }
    }

    /// @notice matches valid orders and transfers their assets
    /// @param sender the message sender
    /// @param orderLeft the left order of the match
    /// @param orderRight the right order of the match
    function _matchAndTransfer(
        address sender,
        LibOrder.Order calldata orderLeft,
        LibOrder.Order calldata orderRight
    ) internal {
        LibAsset.AssetType memory makeMatch = LibAsset.matchAssets(
            orderLeft.makeAsset.assetType,
            orderRight.takeAsset.assetType
        );
        LibAsset.AssetType memory takeMatch = LibAsset.matchAssets(
            orderLeft.takeAsset.assetType,
            orderRight.makeAsset.assetType
        );

        LibFill.FillResult memory newFill = _parseOrdersSetFillEmitMatch(sender, orderLeft, orderRight);

        doTransfers(
            ITransferManager.DealSide({
                asset: LibAsset.Asset({assetType: makeMatch, value: newFill.leftValue}),
                payouts: _payToMaker(orderLeft),
                from: orderLeft.maker
            }),
            ITransferManager.DealSide({
                asset: LibAsset.Asset(takeMatch, newFill.rightValue),
                payouts: _payToMaker(orderRight),
                from: orderRight.maker
            }),
            LibAsset.getFeeSide(makeMatch.assetClass, takeMatch.assetClass)
        );
    }

    /// @notice create a payout array that pays to maker 100%
    /// @param order the order from which the maker is taken
    /// @return an array with just one entry that pays to order.maker
    function _payToMaker(LibOrder.Order memory order) internal pure returns (LibPart.Part[] memory) {
        LibPart.Part[] memory payout = new LibPart.Part[](1);
        payout[0].account = order.maker;
        payout[0].value = 10000;
        return payout;
    }

    /// @notice parse orders with LibOrderDataGeneric parse() to get the order data, then create a new fill with setFillEmitMatch()
    /// @param sender the message sender
    /// @param orderLeft left order
    /// @param orderRight right order
    /// @return newFill fill result
    function _parseOrdersSetFillEmitMatch(
        address sender,
        LibOrder.Order calldata orderLeft,
        LibOrder.Order calldata orderRight
    ) internal returns (LibFill.FillResult memory newFill) {
        bytes32 leftOrderKeyHash = LibOrder.hashKey(orderLeft);
        bytes32 rightOrderKeyHash = LibOrder.hashKey(orderRight);

        uint256 leftOrderFill = _getOrderFill(orderLeft.salt, leftOrderKeyHash);
        uint256 rightOrderFill = _getOrderFill(orderRight.salt, rightOrderKeyHash);
        newFill = LibFill.fillOrder(orderLeft, orderRight, leftOrderFill, rightOrderFill);

        require(newFill.rightValue > 0 && newFill.leftValue > 0, "nothing to fill");

        if (orderLeft.salt != 0) {
            fills[leftOrderKeyHash] = leftOrderFill + newFill.rightValue;
        }

        if (orderRight.salt != 0) {
            fills[rightOrderKeyHash] = rightOrderFill + newFill.leftValue;
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

    uint256[49] private __gap;
}
