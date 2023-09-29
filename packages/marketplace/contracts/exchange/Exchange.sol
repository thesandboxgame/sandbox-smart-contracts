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

    /// @notice role business addresses that can change for example: fees and royalties
    /// @return hash for EXCHANGE_ADMIN_ROLE
    bytes32 public constant EXCHANGE_ADMIN_ROLE = keccak256("EXCHANGE_ADMIN_ROLE");

    /// @notice Exchange contract initializer
    /// @param admin the admin user that can grant/revoke roles, etc.
    /// @param newTrustedForwarder address for trusted forwarder that will execute meta transactions
    /// @param newProtocolFeePrimary protocol fee applied for primary markets
    /// @param newProtocolFeeSecondary protocol fee applied for secondary markets
    /// @param newDefaultFeeReceiver market fee receiver
    /// @param newRoyaltiesProvider registry for the different types of royalties
    /// @param orderValidatorAddress new OrderValidator contract address
    /// @param newAssetMatcher new AssetMatcher contract address
    // solhint-disable-next-line func-name-mixedcase
    function __Exchange_init(
        address admin,
        address newTrustedForwarder,
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider,
        IOrderValidator orderValidatorAddress,
        IAssetMatcher newAssetMatcher
    ) external initializer {
        __ERC2771Handler_init(newTrustedForwarder);
        __AccessControl_init();
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newDefaultFeeReceiver,
            newRoyaltiesProvider
        );
        __ExchangeCoreInitialize(orderValidatorAddress, newAssetMatcher);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Match orders and transact
    /// @param matchedOrders a list of left/right orders that match each other
    function matchOrders(ExchangeMatch[] calldata matchedOrders) external {
        _matchOrders(_msgSender(), matchedOrders);
    }

    /// @notice Match orders and transact
    /// @param sender the original sender of the transaction
    /// @param matchedOrders a list of left/right orders that match each other
    function matchOrdersFrom(
        address sender,
        ExchangeMatch[] calldata matchedOrders
    ) external onlyRole(ERC1776_OPERATOR_ROLE) {
        _matchOrders(sender, matchedOrders);
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
    function setRoyaltiesRegistry(IRoyaltiesProvider newRoyaltiesRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRoyaltiesRegistry(newRoyaltiesRegistry);
    }

    /// @notice set AssetMatcher address
    /// @param contractAddress new AssetMatcher contract address
    function setAssetMatcherContract(IAssetMatcher contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setAssetMatcherContract(contractAddress);
    }

    /// @notice set OrderValidator address
    /// @param contractAddress new OrderValidator contract address
    function setOrderValidatorContract(IOrderValidator contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setOrderValidatorContract(contractAddress);
    }

    /// @notice Change the address of the trusted forwarder for meta-transactions
    /// @param newTrustedForwarder The new trustedForwarder
    function setTrustedForwarder(address newTrustedForwarder) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTrustedForwarder(newTrustedForwarder);
    }

    /// @notice setter for protocol fees
    /// @param newProtocolFeePrimary fee for primary market
    /// @param newProtocolFeeSecondary fee for secondary market
    function setProtocolFee(
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary
    ) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _setProtocolFee(newProtocolFeePrimary, newProtocolFeeSecondary);
    }

    /// @notice setter for default fee receiver
    /// @param newDefaultFeeReceiver address that gets the fees
    function setDefaultFeeReceiver(address newDefaultFeeReceiver) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _setDefaultFeeReceiver(newDefaultFeeReceiver);
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
