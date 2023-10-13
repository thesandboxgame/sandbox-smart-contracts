// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {LibOrder} from "./libraries/LibOrder.sol";
import {ITransferManager} from "./interfaces/ITransferManager.sol";
import {IOrderValidator} from "./interfaces/IOrderValidator.sol";

/// @notice ExchangeCore contract
/// @dev contains the main functions for the marketplace
abstract contract ExchangeCore is Initializable, ITransferManager {
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

    uint256 private matchOrdersLimit;

    /// @notice stores the fills for orders
    mapping(bytes32 orderKeyHash => uint256 orderFillValue) public fills;

    /// @notice event signaling that an order was canceled
    /// @param  orderKeyHash order hash
    event Cancel(bytes32 indexed orderKeyHash, LibOrder.Order order);

    /// @notice event when orders match
    /// @param from _msgSender or operator if used with approve and call
    /// @param orderKeyHashLeft left order key hash
    /// @param orderKeyHashRight right order key hash
    /// @param orderLeft left order
    /// @param orderRight right order
    /// @param newFill fill for left order
    /// @param totalFillLeft total fill left
    /// @param totalFillRight total fill right
    event Match(
        address indexed from,
        bytes32 indexed orderKeyHashLeft,
        bytes32 indexed orderKeyHashRight,
        LibOrder.Order orderLeft,
        LibOrder.Order orderRight,
        LibOrder.FillResult newFill,
        uint256 totalFillLeft,
        uint256 totalFillRight
    );

    /// @notice event for setting a new order validator contract
    /// @param contractAddress new contract address
    event OrderValidatorSet(IOrderValidator indexed contractAddress);

    /// @notice event for setting a new limit for orders that can be matched in one transaction
    /// @param newMatchOrdersLimit new limit
    event MatchOrdersLimitSet(uint256 indexed newMatchOrdersLimit);

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer for ExchangeCore
    /// @param newOrderValidatorAddress new OrderValidator contract address
    /// @param newMatchOrdersLimit limit of orders that can be matched in one transaction
    /// @dev initialize permissions for native token exchange
    // solhint-disable-next-line func-name-mixedcase
    function __ExchangeCoreInitialize(
        IOrderValidator newOrderValidatorAddress,
        uint256 newMatchOrdersLimit
    ) internal onlyInitializing {
        _setOrderValidatorContract(newOrderValidatorAddress);
        _setMatchOrdersLimit(newMatchOrdersLimit);
    }

    /// @notice set OrderValidator address
    /// @param contractAddress new OrderValidator contract address
    function _setOrderValidatorContract(IOrderValidator contractAddress) internal {
        require(address(contractAddress) != address(0), "invalid order validator");
        orderValidator = contractAddress;
        emit OrderValidatorSet(contractAddress);
    }

    /// @notice setter for limit of orders that can be matched in one transaction
    /// @param newMatchOrdersLimit new limit
    function _setMatchOrdersLimit(uint256 newMatchOrdersLimit) internal {
        require(newMatchOrdersLimit > 0, "invalid quantity");
        matchOrdersLimit = newMatchOrdersLimit;
        emit MatchOrdersLimitSet(matchOrdersLimit);
    }

    /// @notice cancel order
    /// @param order to be canceled
    /// @param orderKeyHash used as a checksum to avoid mistakes in the values of order
    /// @dev require msg sender to be order maker and salt different from 0
    function _cancel(LibOrder.Order calldata order, bytes32 orderKeyHash) internal {
        require(order.salt != 0, "0 salt can't be used");
        bytes32 _orderKeyHash = LibOrder.hashKey(order);
        require(_orderKeyHash == orderKeyHash, "Invalid orderHash");
        fills[orderKeyHash] = type(uint256).max;
        emit Cancel(orderKeyHash, order);
    }

    /// @notice Match orders and transact
    /// @param sender the original sender of the transaction
    /// @param matchedOrders a list of left/right orders that match each other
    /// @dev validate orders through validateOrders before matchAndTransfer
    function _matchOrders(address sender, ExchangeMatch[] calldata matchedOrders) internal {
        uint256 len = matchedOrders.length;
        require(len > 0, "ExchangeMatch cant be empty");
        require(len <= matchOrdersLimit, "too many ExchangeMatch");
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

        LibOrder.FillResult memory newFill = _parseOrdersSetFillEmitMatch(sender, orderLeft, orderRight);

        doTransfers(
            ITransferManager.DealSide(LibAsset.Asset(makeMatch, newFill.leftValue), orderLeft.maker),
            ITransferManager.DealSide(LibAsset.Asset(takeMatch, newFill.rightValue), orderRight.maker),
            LibAsset.getFeeSide(makeMatch.assetClass, takeMatch.assetClass)
        );
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
    ) internal returns (LibOrder.FillResult memory newFill) {
        bytes32 orderKeyHashLeft = LibOrder.hashKey(orderLeft);
        bytes32 orderKeyHashRight = LibOrder.hashKey(orderRight);

        uint256 leftOrderFill = _getOrderFill(orderLeft.salt, orderKeyHashLeft);
        uint256 rightOrderFill = _getOrderFill(orderRight.salt, orderKeyHashRight);
        newFill = LibOrder.fillOrder(orderLeft, orderRight, leftOrderFill, rightOrderFill);

        require(newFill.rightValue > 0 && newFill.leftValue > 0, "nothing to fill");

        if (orderLeft.salt != 0) {
            fills[orderKeyHashLeft] = leftOrderFill + newFill.rightValue;
        }

        if (orderRight.salt != 0) {
            fills[orderKeyHashRight] = rightOrderFill + newFill.leftValue;
        }

        emit Match({
            from: sender,
            orderKeyHashLeft: orderKeyHashLeft,
            orderKeyHashRight: orderKeyHashRight,
            orderLeft: orderLeft,
            orderRight: orderRight,
            newFill: newFill,
            totalFillLeft: fills[orderKeyHashLeft],
            totalFillRight: fills[orderKeyHashRight]
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

    // slither-disable-next-line unused-state
    uint256[49] private __gap;
}
