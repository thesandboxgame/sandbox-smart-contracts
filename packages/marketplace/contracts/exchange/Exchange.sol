// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";
import {IAssetMatcher} from "../interfaces/IAssetMatcher.sol";
import {TransferManager, IRoyaltiesProvider} from "../transfer-manager/TransferManager.sol";
import {LibDirectTransfer} from "./libraries/LibDirectTransfer.sol";
import {LibOrder} from "../lib-order/LibOrder.sol";
import {ExchangeCore} from "./ExchangeCore.sol";

/// @title Exchange contract with meta transactions
/// @notice Used to exchange assets, that is, tokens.
/// @dev Main functions are in ExchangeCore
/// @dev TransferManager is used to execute token transfers
contract Exchange is Initializable, AccessControlUpgradeable, ExchangeCore, TransferManager, ERC2771HandlerUpgradeable {
    /// @notice role erc1776 trusted meta transaction contracts (Sand for example).
    /// @return hash for ERC1776_OPERATOR_ROLE
    bytes32 public constant ERC1776_OPERATOR_ROLE = keccak256("ERC1776_OPERATOR_ROLE");

    // TODO: Review the roles we need.
    modifier onlyOwner() {
        _checkRole(DEFAULT_ADMIN_ROLE);
        _;
    }

    /// @notice Exchange contract initializer
    /// @param admin the admin user that can grant/revoke roles, etc.
    /// @param newTrustedForwarder address for trusted forwarder that will execute meta transactions
    /// @param newProtocolFeePrimary protocol fee applied for primary markets
    /// @param newProtocolFeeSecondary protocol fee applied for secondary markets
    /// @param newDefaultFeeReceiver market fee receiver
    /// @param newRoyaltiesProvider registry for the different types of royalties
    /// @param orderValidatorAddress address of the OrderValidator contract, that validates orders
    /// @param newNativeOrder bool to indicate of the contract accepts or doesn't native tokens, i.e. ETH or Matic
    /// @param newMetaNative same as =nativeOrder but for metaTransactions
    // solhint-disable-next-line func-name-mixedcase
    function __Exchange_init(
        address admin,
        address newTrustedForwarder,
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider,
        IOrderValidator orderValidatorAddress,
        bool newNativeOrder,
        bool newMetaNative
    ) external initializer {
        __ERC2771Handler_init(newTrustedForwarder);
        __AccessControl_init();
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newDefaultFeeReceiver,
            newRoyaltiesProvider
        );
        __ExchangeCoreInitialize(newNativeOrder, newMetaNative, orderValidatorAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Match orders and transact
    /// @param orderLeft left order
    /// @param signatureLeft signature for the left order
    /// @param orderRight right signature
    /// @param signatureRight signature for the right order
    /// @dev validate orders through validateOrders before matchAndTransfer
    function matchOrders(
        LibOrder.Order calldata orderLeft,
        bytes calldata signatureLeft,
        LibOrder.Order calldata orderRight,
        bytes calldata signatureRight
    ) external payable {
        _validateOrders(_msgSender(), orderLeft, signatureLeft, orderRight, signatureRight);
        _matchAndTransfer(_msgSender(), orderLeft, orderRight);
    }

    /// @notice Match orders and transact
    /// @param orderLeft left order
    /// @param signatureLeft signature for the left order
    /// @param orderRight right signature
    /// @param signatureRight signature for the right order
    /// @dev validate orders through validateOrders before matchAndTransfer
    function matchOrdersFrom(
        address from,
        LibOrder.Order calldata orderLeft,
        bytes calldata signatureLeft,
        LibOrder.Order calldata orderRight,
        bytes calldata signatureRight
    ) external payable onlyRole(ERC1776_OPERATOR_ROLE) {
        // TODO: Whenever we emit a match we must also emit operator and from
        _validateOrders(from, orderLeft, signatureLeft, orderRight, signatureRight);
        _matchAndTransfer(from, orderLeft, orderRight);
    }

    /// @dev function, generate sellOrder and buyOrder from parameters and call validateAndMatch() for accept bid transaction
    /// @param direct struct with parameters for accept bid operation
    function directAcceptBid(LibDirectTransfer.AcceptBid calldata direct) external payable {
        _directAcceptBid(_msgSender(), direct);
    }

    /// @notice direct purchase orders - can handle bulk purchases
    /// @param direct array of purchase order
    /// @dev The buyer param was added so the function is compatible with Sand approveAndCall
    function directPurchase(address buyer, LibDirectTransfer.Purchase[] calldata direct) external payable {
        for (uint256 i; i < direct.length; ) {
            _directPurchase(_msgSender(), buyer, direct[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice cancel order
    /// @param order to be canceled
    /// @dev require msg sender to be order maker and salt different from 0
    function cancel(LibOrder.Order calldata order, bytes32 orderHash) external {
        require(_msgSender() == order.maker, "ExchangeCore: not maker");
        _cancel(order, orderHash);
    }

    /// @notice setter for royalty registry
    /// @param newRoyaltiesRegistry address of new royalties registry
    function setRoyaltiesRegistry(IRoyaltiesProvider newRoyaltiesRegistry) external onlyOwner {
        _setRoyaltiesRegistry(newRoyaltiesRegistry);
    }

    /// @notice setter for protocol fees
    /// @param newProtocolFeePrimary fee for primary market
    /// @param newProtocolFeeSecondary fee for secondary market
    function setProtocolFee(uint256 newProtocolFeePrimary, uint256 newProtocolFeeSecondary) external onlyOwner {
        _setProtocolFee(newProtocolFeePrimary, newProtocolFeeSecondary);
    }

    /// @notice set AssetMatcher address
    /// @param contractAddress new AssetMatcher contract address
    function setAssetMatcherContract(IAssetMatcher contractAddress) external onlyOwner {
        _setAssetMatcherContract(contractAddress);
    }

    /// @notice set OrderValidator address
    /// @param contractAddress new OrderValidator contract address
    function setOrderValidatorContract(IOrderValidator contractAddress) external onlyOwner {
        _setOrderValidatorContract(contractAddress);
    }

    /// @notice update permissions for native orders
    /// @param newNativeOrder for orders with native token
    /// @param newMetaNative for meta orders with native token
    /// @dev setter for permissions for native token exchange
    function updateNative(bool newNativeOrder, bool newMetaNative) external onlyOwner {
        _updateNative(newNativeOrder, newMetaNative);
    }

    /// @notice Change the address of the trusted forwarder for meta-transactions
    /// @param newTrustedForwarder The new trustedForwarder
    function setTrustedForwarder(address newTrustedForwarder) external virtual onlyOwner {
        require(newTrustedForwarder != address(0), "address must be different from 0");

        _setTrustedForwarder(newTrustedForwarder);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165Upgradeable, AccessControlUpgradeable) returns (bool) {
        return
            ERC165Upgradeable.supportsInterface(interfaceId) || AccessControlUpgradeable.supportsInterface(interfaceId);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }
}
