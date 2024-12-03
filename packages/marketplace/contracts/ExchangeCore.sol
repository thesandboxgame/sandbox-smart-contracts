// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {LibOrder} from "./libraries/LibOrder.sol";
import {ITransferManager} from "./interfaces/ITransferManager.sol";
import {IOrderValidator} from "./interfaces/IOrderValidator.sol";

/// @author The Sandbox
/// @title ExchangeCore Contract
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Contains the main functions for the marketplace.
/// @dev This is an abstract contract that requires implementation.
abstract contract ExchangeCore is Initializable, ITransferManager {
    /// @dev Stores left and right orders that match each other.
    /// Left and right are symmetrical except for fees that are taken from the left side first.
    struct ExchangeMatch {
        LibOrder.Order orderLeft; // Left order details
        bytes signatureLeft; // Signature of the left order
        LibOrder.Order orderRight; // Right order details
        bytes signatureRight; // Signature of the right order
    }

    /// @dev Address of the OrderValidator contract.
    IOrderValidator public orderValidator;

    /// @dev Limit for the number of orders that can be matched in a single transaction.
    uint256 private matchOrdersLimit;

    /// @dev Mapping to store the fill amount for each order, identified by its hash.
    mapping(bytes32 orderKeyHash => uint256 orderFillValue) public fills;

    /// @notice Event emitted when an order is canceled.
    /// @param orderKeyHash The hash of the order being canceled.
    /// @param order The details of the order being canceled.
    event Cancel(bytes32 indexed orderKeyHash, LibOrder.Order order);

    /// @notice Event emitted when two orders are matched.
    /// @param from Address that initiated the match.
    /// @param orderKeyHashLeft Hash of the left order.
    /// @param orderKeyHashRight Hash of the right order.
    /// @param orderLeft Details of the left order.
    /// @param orderRight Details of the right order.
    /// @param newFill Fill details resulting from the order match.
    /// @param totalFillLeft Total fill amount for the left order.
    /// @param totalFillRight Total fill amount for the right order.
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

    /// @notice Event emitted when a new OrderValidator contract is set.
    /// @param contractAddress Address of the new OrderValidator contract.
    event OrderValidatorSet(IOrderValidator indexed contractAddress);

    /// @notice Event emitted when the match orders limit is updated.
    /// @param newMatchOrdersLimit The new limit for matching orders in one transaction.
    event MatchOrdersLimitSet(uint256 indexed newMatchOrdersLimit);

    /// @dev Constructor to disable initializers for this contract.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the ExchangeCore contract.
    /// @param newOrderValidatorAddress Address of the new OrderValidator contract.
    /// @param newMatchOrdersLimit The limit for matching orders in one transaction.
    // solhint-disable-next-line func-name-mixedcase
    function __ExchangeCoreInitialize(
        IOrderValidator newOrderValidatorAddress,
        uint256 newMatchOrdersLimit
    ) internal onlyInitializing {
        _setOrderValidatorContract(newOrderValidatorAddress);
        _setMatchOrdersLimit(newMatchOrdersLimit);
    }

    /// @notice Updates the OrderValidator contract address.
    /// @param contractAddress Address of the new OrderValidator contract.
    function _setOrderValidatorContract(IOrderValidator contractAddress) internal {
        require(
            ERC165Checker.supportsInterface(address(contractAddress), type(IOrderValidator).interfaceId),
            "invalid order validator"
        );
        orderValidator = contractAddress;
        emit OrderValidatorSet(contractAddress);
    }

    /// @notice Updates the limit for the number of orders that can be matched in a single transaction.
    /// @param newMatchOrdersLimit The new limit for matching orders.
    function _setMatchOrdersLimit(uint256 newMatchOrdersLimit) internal {
        require(newMatchOrdersLimit > 0, "invalid quantity");
        matchOrdersLimit = newMatchOrdersLimit;
        emit MatchOrdersLimitSet(matchOrdersLimit);
    }

    /// @notice Cancels a specified order.
    /// @param order Details of the order to be canceled.
    /// @param orderKeyHash The hash of the order, used for verification.
    function _cancel(LibOrder.Order calldata order, bytes32 orderKeyHash) internal {
        require(order.salt != 0, "0 salt can't be used");
        bytes32 _orderKeyHash = LibOrder.hashKey(order);
        require(_orderKeyHash == orderKeyHash, "invalid orderHash");
        fills[orderKeyHash] = type(uint256).max;
        emit Cancel(orderKeyHash, order);
    }

    /// @notice Matches provided orders and performs the transaction.
    /// @param sender The original sender of the transaction.
    /// @param matchedOrders Array of orders that are matched with each other.
    function _matchOrders(address sender, ExchangeMatch[] calldata matchedOrders) internal {
        uint256 len = matchedOrders.length;
        require(len > 0, "ExchangeMatch cannot be empty");
        require(len <= matchOrdersLimit, "too many ExchangeMatch");
        for (uint256 i; i < len; ++i) {
            ExchangeMatch calldata m = matchedOrders[i];
            _validateOrders(sender, m.orderLeft, m.signatureLeft, m.orderRight, m.signatureRight);
            _matchAndTransfer(sender, m.orderLeft, m.orderRight);
        }
    }

    /// @dev Validates the provided orders.
    /// @param sender Address of the sender.
    /// @param orderLeft Details of the left order.
    /// @param signatureLeft Signature of the left order.
    /// @param orderRight Details of the right order.
    /// @param signatureRight Signature of the right order.
    function _validateOrders(
        address sender,
        LibOrder.Order memory orderLeft,
        bytes memory signatureLeft,
        LibOrder.Order memory orderRight,
        bytes memory signatureRight
    ) internal view {
        if (orderLeft.taker != address(0)) {
            require(orderRight.maker == orderLeft.taker, "leftOrder.taker failed");
        }
        if (orderRight.taker != address(0)) {
            require(orderRight.taker == orderLeft.maker, "rightOrder.taker failed");
        }
        // validate must force order.maker != address(0)
        orderValidator.validate(orderLeft, signatureLeft, sender);
        orderValidator.validate(orderRight, signatureRight, sender);
    }

    /// @notice Matches valid orders and transfers the associated assets.
    /// @param sender Address initiating the match.
    /// @param orderLeft The left order.
    /// @param orderRight The right order.
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

    /// @notice Parse orders to get the order data, then create a new fill with setFillEmitMatch()
    /// @param sender The message sender
    /// @param orderLeft Left order
    /// @param orderRight Right order
    /// @return newFill Fill result
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

        require(newFill.rightValue > 0, "nothing to fill right");
        require(newFill.leftValue > 0, "nothing to fill left");

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

    /// @notice Return fill corresponding to order hash
    /// @param salt If salt 0, fill = 0
    /// @param hash Order hash
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
