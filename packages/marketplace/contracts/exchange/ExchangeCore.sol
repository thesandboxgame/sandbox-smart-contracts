// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibFill} from "./libraries/LibFill.sol";
import {LibDirectTransfer} from "./libraries/LibDirectTransfer.sol";
import {IAssetMatcher} from "../interfaces/IAssetMatcher.sol";
import {TransferExecutor, Initializable, OwnableUpgradeable, LibTransfer} from "../transfer-manager/TransferExecutor.sol";
import {LibDeal, LibFeeSide, LibPart, LibAsset} from "../transfer-manager/lib/LibDeal.sol";
import {LibOrderDataGeneric, LibOrder, LibOrderData} from "./libraries/LibOrderDataGeneric.sol";
import {ITransferManager} from "../transfer-manager/interfaces/ITransferManager.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";

/// @notice ExchangeCore contract
/// @dev contains the main functions for the marketplace
abstract contract ExchangeCore is Initializable, OwnableUpgradeable, TransferExecutor, ITransferManager {
    using LibTransfer for address payable;

    /// @notice AssetMatcher contract
    /// @return AssetMatcher address
    IAssetMatcher public assetMatcher;

    /// @notice OrderValidator contract
    /// @return OrderValidator address
    IOrderValidator public orderValidator;

    uint256 private constant UINT256_MAX = type(uint256).max;

    /// @notice boolean to indicate if native tokens are accepted for meta transactions
    /// @return true if native tokens are accepted for meta tx, false otherwise
    bool public nativeMeta;

    /// @notice boolean to indicate if native tokens are accepted
    /// @return true if native tokens are accepted, false otherwise
    bool public nativeOrder;

    /// @notice stores the fills for orders
    /// @return order fill
    mapping(bytes32 => uint256) public fills;

    /// @notice event signaling that an order was canceled
    /// @param  hash order hash
    event Cancel(bytes32 indexed hash);

    /// @notice event when orders match
    /// @param from _msgSender
    /// @param leftHash left order hash
    /// @param rightHash right order hash
    /// @param newLeftFill fill for left order
    /// @param newRightFill fill for right order
    event Match(address indexed from, bytes32 leftHash, bytes32 rightHash, uint256 newLeftFill, uint256 newRightFill);
    event AssetMatcherSetted(address indexed contractAddress);
    event OrderValidatorSetted(address indexed contractAddress);
    event NativeUpdated(bool nativeOrder, bool metaNative);

    /// @notice initializer for ExchangeCore
    /// @param newNativeOrder for orders with native token
    /// @param newMetaNative for meta orders with native token
    /// @dev initialize permissions for native token exchange
    function __ExchangeCoreInitialize(
        bool newNativeOrder,
        bool newMetaNative,
        address newOrderValidatorAdress
    ) internal {
        nativeMeta = newMetaNative;
        nativeOrder = newNativeOrder;
        IOrderValidator _orderValidator = IOrderValidator(newOrderValidatorAdress);
        orderValidator = _orderValidator;
    }

    /// @notice set AssetMatcher address
    /// @param contractAddress new AssetMatcher contract address
    function setAssetMatcherContract(address contractAddress) external onlyOwner {
        IAssetMatcher _assetMatcher = IAssetMatcher(contractAddress);
        assetMatcher = _assetMatcher;

        emit AssetMatcherSetted(contractAddress);
    }

    /// @notice set OrderValidator address
    /// @param contractAddress new OrderValidator contract address
    function setOrderValidatorContract(address contractAddress) external onlyOwner {
        IOrderValidator _orderValidator = IOrderValidator(contractAddress);
        orderValidator = _orderValidator;

        emit OrderValidatorSetted(contractAddress);
    }

    /// @notice get order hashKey
    /// @param order to generate the hashkey
    /// @dev this function is a helper for the backend
    /// @return hash of order
    function getHashKey(LibOrder.Order memory order) external pure returns (bytes32) {
        return LibOrder.hashKey(order);
    }

    /// @notice update permissions for native orders
    /// @param newNativeOrder for orders with native token
    /// @param newMetaNative for meta orders with native token
    /// @dev setter for permissions for native token exchange
    function updateNative(bool newNativeOrder, bool newMetaNative) external onlyOwner {
        nativeMeta = newMetaNative;
        nativeOrder = newNativeOrder;

        emit NativeUpdated(newNativeOrder, newMetaNative);
    }

    /// @notice cancel order
    /// @param order to be canceled
    /// @dev require msg sender to be order maker and salt different from 0
    function cancel(LibOrder.Order memory order, bytes32 orderHash) external {
        require(_msgSender() == order.maker, "ExchangeCore: not maker");
        require(order.salt != 0, "ExchangeCore: 0 salt can't be used");
        bytes32 orderKeyHash = LibOrder.hashKey(order);
        require(orderHash == orderKeyHash, "ExchangeCore: Invalid orderHash");
        fills[orderKeyHash] = UINT256_MAX;
        emit Cancel(orderKeyHash);
    }

    /// @notice direct purchase orders - can handle bulk purchases
    /// @param direct array of purchase order
    /// @param signature array of signed message specifying order details with the buyer
    /// @dev The buyer param was added so the function is compatible with Sand approveAndCall
    function directPurchase(
        address buyer,
        LibDirectTransfer.Purchase[] calldata direct,
        bytes[] calldata signature
    ) external payable {
        for (uint256 i; i < direct.length; ) {
            _directPurchase(buyer, direct[i], signature[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice generate sellOrder and buyOrder from parameters and call validateAndMatch() for purchase transaction
    /// @param direct purchase order
    function _directPurchase(
        address buyer,
        LibDirectTransfer.Purchase calldata direct,
        bytes calldata signature
    ) internal {
        LibAsset.AssetType memory paymentAssetType = getPaymentAssetType(direct.paymentToken);

        LibOrder.OrderBack memory orderBack = LibOrder.OrderBack(
            buyer,
            direct.sellOrderMaker,
            LibAsset.Asset(LibAsset.AssetType(direct.nftAssetClass, direct.nftData), direct.sellOrderNftAmount),
            address(0),
            LibAsset.Asset(paymentAssetType, direct.sellOrderPaymentAmount),
            direct.sellOrderSalt,
            direct.sellOrderStart,
            direct.sellOrderEnd,
            direct.sellOrderDataType,
            direct.sellOrderData
        );

        require(orderValidator.isPurchaseValid(orderBack, signature), "INVALID_PURCHASE");

        LibOrder.Order memory sellOrder = LibOrder.Order(
            direct.sellOrderMaker,
            LibAsset.Asset(LibAsset.AssetType(direct.nftAssetClass, direct.nftData), direct.sellOrderNftAmount),
            address(0),
            LibAsset.Asset(paymentAssetType, direct.sellOrderPaymentAmount),
            direct.sellOrderSalt,
            direct.sellOrderStart,
            direct.sellOrderEnd,
            direct.sellOrderDataType,
            direct.sellOrderData
        );

        LibOrder.Order memory buyOrder = LibOrder.Order(
            buyer,
            LibAsset.Asset(paymentAssetType, direct.buyOrderPaymentAmount),
            address(0),
            LibAsset.Asset(LibAsset.AssetType(direct.nftAssetClass, direct.nftData), direct.buyOrderNftAmount),
            0,
            0,
            0,
            getOtherOrderType(direct.sellOrderDataType),
            direct.buyOrderData
        );
        orderValidator.verifyERC20Whitelist(direct.paymentToken);
        validateFull(sellOrder, direct.sellOrderSignature);
        matchAndTransfer(sellOrder, buyOrder);
    }

    ///  @dev function, generate sellOrder and buyOrder from parameters and call validateAndMatch() for accept bid transaction
    ///  @param direct struct with parameters for accept bid operation
    function directAcceptBid(LibDirectTransfer.AcceptBid calldata direct) external payable {
        LibAsset.AssetType memory paymentAssetType = getPaymentAssetType(direct.paymentToken);

        LibOrder.Order memory buyOrder = LibOrder.Order(
            direct.bidMaker,
            LibAsset.Asset(paymentAssetType, direct.bidPaymentAmount),
            address(0),
            LibAsset.Asset(LibAsset.AssetType(direct.nftAssetClass, direct.nftData), direct.bidNftAmount),
            direct.bidSalt,
            direct.bidStart,
            direct.bidEnd,
            direct.bidDataType,
            direct.bidData
        );

        LibOrder.Order memory sellOrder = LibOrder.Order(
            address(0),
            LibAsset.Asset(LibAsset.AssetType(direct.nftAssetClass, direct.nftData), direct.sellOrderNftAmount),
            address(0),
            LibAsset.Asset(paymentAssetType, direct.sellOrderPaymentAmount),
            0,
            0,
            0,
            getOtherOrderType(direct.bidDataType),
            direct.sellOrderData
        );

        validateFull(buyOrder, direct.bidSignature);
        matchAndTransfer(sellOrder, buyOrder);
    }

    /// @notice Match orders and transact
    /// @param orderLeft left order
    /// @param signatureLeft signature for the left order
    /// @param orderRight right signature
    /// @param signatureRight signature for the right order
    /// @dev validate orders through validateOrders before matchAndTransfer
    function matchOrders(
        LibOrder.Order memory orderLeft,
        bytes memory signatureLeft,
        LibOrder.Order memory orderRight,
        bytes memory signatureRight
    ) external payable {
        validateOrders(orderLeft, signatureLeft, orderRight, signatureRight);
        matchAndTransfer(orderLeft, orderRight);
    }

    /// @dev function, validate orders
    /// @param orderLeft left order
    /// @param signatureLeft order left signature
    /// @param orderRight right order
    /// @param signatureRight order right signature
    function validateOrders(
        LibOrder.Order memory orderLeft,
        bytes memory signatureLeft,
        LibOrder.Order memory orderRight,
        bytes memory signatureRight
    ) internal view {
        validateFull(orderLeft, signatureLeft);
        validateFull(orderRight, signatureRight);
        if (orderLeft.taker != address(0)) {
            if (orderRight.maker != address(0)) require(orderRight.maker == orderLeft.taker, "leftOrder.taker failed");
        }
        if (orderRight.taker != address(0)) {
            if (orderLeft.maker != address(0)) require(orderRight.taker == orderLeft.maker, "rightOrder.taker failed");
        }
    }

    /// @notice matches valid orders and transfers their assets
    /// @param orderLeft the left order of the match
    /// @param orderRight the right order of the match
    function matchAndTransfer(LibOrder.Order memory orderLeft, LibOrder.Order memory orderRight) internal {
        (LibAsset.AssetType memory makeMatch, LibAsset.AssetType memory takeMatch) = matchAssets(orderLeft, orderRight);

        (
            LibOrderDataGeneric.GenericOrderData memory leftOrderData,
            LibOrderDataGeneric.GenericOrderData memory rightOrderData,
            LibFill.FillResult memory newFill
        ) = parseOrdersSetFillEmitMatch(orderLeft, orderRight);

        (uint256 totalMakeValue, uint256 totalTakeValue) = doTransfers(
            LibDeal.DealSide({
                asset: LibAsset.Asset({assetType: makeMatch, value: newFill.leftValue}),
                payouts: leftOrderData.payouts,
                originFees: leftOrderData.originFees,
                from: orderLeft.maker
            }),
            LibDeal.DealSide({
                asset: LibAsset.Asset(takeMatch, newFill.rightValue),
                payouts: rightOrderData.payouts,
                originFees: rightOrderData.originFees,
                from: orderRight.maker
            }),
            getDealData(
                makeMatch.assetClass,
                takeMatch.assetClass,
                orderLeft.dataType,
                orderRight.dataType,
                leftOrderData,
                rightOrderData
            )
        );

        uint256 takeBuyAmount = newFill.rightValue;
        uint256 makeBuyAmount = newFill.leftValue;

        if (((_msgSender() != msg.sender) && !nativeMeta) || ((_msgSender() == msg.sender) && !nativeOrder)) {
            require(makeMatch.assetClass != LibAsset.ETH_ASSET_CLASS, "maker cannot transfer native token");
            require(takeMatch.assetClass != LibAsset.ETH_ASSET_CLASS, "taker cannot transfer native token");
        }
        if (makeMatch.assetClass == LibAsset.ETH_ASSET_CLASS) {
            require(takeMatch.assetClass != LibAsset.ETH_ASSET_CLASS, "taker cannot transfer native token");
            require(makeBuyAmount >= totalMakeValue, "not enough eth");
            if (makeBuyAmount > totalMakeValue) {
                payable(msg.sender).transferEth(makeBuyAmount - totalMakeValue);
            }
        } else if (takeMatch.assetClass == LibAsset.ETH_ASSET_CLASS) {
            require(takeBuyAmount >= totalTakeValue, "not enough eth");
            if (takeBuyAmount > totalTakeValue) {
                payable(msg.sender).transferEth(takeBuyAmount - totalTakeValue);
            }
        }
    }

    /// @notice parse orders with LibOrderDataGeneric parse() to get the order data, then create a new fill with setFillEmitMatch()
    /// @param orderLeft left order
    /// @param orderRight right order
    /// @return leftOrderData generic order data from left order
    /// @return rightOrderData generic order data from right order
    /// @return newFill fill result
    function parseOrdersSetFillEmitMatch(
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

        address msgSender = _msgSender();
        if (orderLeft.maker == address(0)) {
            orderLeft.maker = msgSender;
        }
        if (orderRight.maker == address(0)) {
            orderRight.maker = msgSender;
        }

        leftOrderData = LibOrderDataGeneric.parse(orderLeft);
        rightOrderData = LibOrderDataGeneric.parse(orderRight);

        newFill = setFillEmitMatch(
            orderLeft,
            orderRight,
            leftOrderKeyHash,
            rightOrderKeyHash,
            leftOrderData.isMakeFill,
            rightOrderData.isMakeFill
        );
    }

    /// @notice return the deal data from orders
    /// @param makeMatchAssetClass, class of make asset
    /// @param takeMatchAssetClass, class of take asset
    /// @param leftDataType data type of left order
    /// @param rightDataType data type of right order
    /// @param leftOrderData data of left order
    /// @param rightOrderData  data of right order
    /// @dev return deal data (feeSide and maxFeesBasePoint) from orders
    function getDealData(
        bytes4 makeMatchAssetClass,
        bytes4 takeMatchAssetClass,
        bytes4 leftDataType,
        bytes4 rightDataType,
        LibOrderDataGeneric.GenericOrderData memory leftOrderData,
        LibOrderDataGeneric.GenericOrderData memory rightOrderData
    ) internal pure returns (LibDeal.DealData memory dealData) {
        dealData.feeSide = LibFeeSide.getFeeSide(makeMatchAssetClass, takeMatchAssetClass);
        dealData.maxFeesBasePoint = getMaxFee(
            leftDataType,
            rightDataType,
            leftOrderData,
            rightOrderData,
            dealData.feeSide
        );
    }

    ///    @notice determines the max amount of fees for the match
    ///    @param dataTypeLeft data type of the left order
    ///    @param dataTypeRight data type of the right order
    ///    @param leftOrderData data of the left order
    ///    @param rightOrderData data of the right order
    ///    @param feeSide fee side of the match
    ///    @return max fee amount in base points
    function getMaxFee(
        bytes4 dataTypeLeft,
        bytes4 dataTypeRight,
        LibOrderDataGeneric.GenericOrderData memory leftOrderData,
        LibOrderDataGeneric.GenericOrderData memory rightOrderData,
        LibFeeSide.FeeSide feeSide
    ) internal pure returns (uint256) {
        if (
            dataTypeLeft != LibOrderData.SELL &&
            dataTypeRight != LibOrderData.SELL &&
            dataTypeLeft != LibOrderData.BUY &&
            dataTypeRight != LibOrderData.BUY
        ) {
            return 0;
        }

        uint256 matchFees = getSumFees(leftOrderData.originFees, rightOrderData.originFees);
        uint256 maxFee;
        if (feeSide == LibFeeSide.FeeSide.LEFT) {
            maxFee = rightOrderData.maxFeesBasePoint;
            require(dataTypeLeft == LibOrderData.BUY && dataTypeRight == LibOrderData.SELL, "wrong V3 type1");
        } else if (feeSide == LibFeeSide.FeeSide.RIGHT) {
            maxFee = leftOrderData.maxFeesBasePoint;
            require(dataTypeRight == LibOrderData.BUY && dataTypeLeft == LibOrderData.SELL, "wrong V3 type2");
        } else {
            return 0;
        }
        require(maxFee > 0 && maxFee >= matchFees && maxFee <= 1000, "wrong maxFee");

        return maxFee;
    }

    ///    @notice calculates amount of fees for the match
    ///    @param originLeft origin fees of the left order
    ///    @param originRight origin fees of the right order
    ///    @return sum of all fees for the match (protcolFee + leftOrder.originFees + rightOrder.originFees)
    function getSumFees(
        LibPart.Part[] memory originLeft,
        LibPart.Part[] memory originRight
    ) internal pure returns (uint256) {
        uint256 result = 0;

        //adding left origin fees
        for (uint256 i; i < originLeft.length; i++) {
            result = result + originLeft[i].value;
        }

        //adding right origin fees
        for (uint256 i; i < originRight.length; i++) {
            result = result + originRight[i].value;
        }

        return result;
    }

    ///    @notice calculates fills for the matched orders and set them in "fills" mapping
    ///    @param orderLeft left order of the match
    ///    @param orderRight right order of the match
    ///    @param leftMakeFill true if the left orders uses make-side fills, false otherwise
    ///    @param rightMakeFill true if the right orders uses make-side fills, false otherwise
    ///    @return returns change in orders' fills by the match
    function setFillEmitMatch(
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight,
        bytes32 leftOrderKeyHash,
        bytes32 rightOrderKeyHash,
        bool leftMakeFill,
        bool rightMakeFill
    ) internal returns (LibFill.FillResult memory) {
        uint256 leftOrderFill = getOrderFill(orderLeft.salt, leftOrderKeyHash);
        uint256 rightOrderFill = getOrderFill(orderRight.salt, rightOrderKeyHash);
        LibFill.FillResult memory newFill = LibFill.fillOrder(
            orderLeft,
            orderRight,
            leftOrderFill,
            rightOrderFill,
            leftMakeFill,
            rightMakeFill
        );

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

        emit Match(_msgSender(), leftOrderKeyHash, rightOrderKeyHash, newFill.rightValue, newFill.leftValue);

        return newFill;
    }

    /// @notice return fill corresponding to order hash
    /// @param salt if salt 0, fill = 0
    /// @param hash order hash
    function getOrderFill(uint256 salt, bytes32 hash) internal view returns (uint256 fill) {
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
    function matchAssets(
        LibOrder.Order memory orderLeft,
        LibOrder.Order memory orderRight
    ) internal view returns (LibAsset.AssetType memory makeMatch, LibAsset.AssetType memory takeMatch) {
        makeMatch = assetMatcher.matchAssets(orderLeft.makeAsset.assetType, orderRight.takeAsset.assetType);
        require(makeMatch.assetClass != 0, "assets don't match");
        takeMatch = assetMatcher.matchAssets(orderLeft.takeAsset.assetType, orderRight.makeAsset.assetType);
        require(takeMatch.assetClass != 0, "assets don't match");
    }

    /// @notice full validation of an order
    /// @param order LibOrder.Order
    /// @param signature order signature
    /// @dev first validate time if order start and end are within the block timestamp
    /// @dev validate signature if maker is different from sender
    function validateFull(LibOrder.Order memory order, bytes memory signature) internal view {
        LibOrder.validateOrderTime(order);
        orderValidator.validate(order, signature, _msgSender());
    }

    /// @notice return the AssetType from the token contract
    /// @param token contract address
    function getPaymentAssetType(address token) internal pure returns (LibAsset.AssetType memory) {
        LibAsset.AssetType memory result = LibAsset.AssetType(bytes4(0), new bytes(0));
        if (token == address(0)) {
            result.assetClass = LibAsset.ETH_ASSET_CLASS;
        } else {
            result.assetClass = LibAsset.ERC20_ASSET_CLASS;
            result.data = abi.encode(token);
        }
        return result;
    }

    /// @notice get the other order type
    /// @param dataType of order
    /// @dev if SELL returns BUY else if BUY returns SELL
    function getOtherOrderType(bytes4 dataType) internal pure returns (bytes4) {
        if (dataType == LibOrderData.SELL) {
            return LibOrderData.BUY;
        }
        if (dataType == LibOrderData.BUY) {
            return LibOrderData.SELL;
        }
        return dataType;
    }

    uint256[49] private __gap;
}
