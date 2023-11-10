// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {IOrderValidator} from "./interfaces/IOrderValidator.sol";
import {TransferManager, IRoyaltiesProvider} from "./TransferManager.sol";
import {LibOrder} from "./libraries/LibOrder.sol";
import {ExchangeCore} from "./ExchangeCore.sol";

/// @author The Sandbox
/// @title Exchange contract with meta transactions
/// @notice Used to exchange assets, that is, tokens.
/// @dev Main functions are in ExchangeCore
/// @dev TransferManager is used to execute token transfers
contract Exchange is
    Initializable,
    AccessControlEnumerableUpgradeable,
    ExchangeCore,
    TransferManager,
    ERC2771HandlerUpgradeable,
    PausableUpgradeable
{
    /// @notice Role for ERC1776 trusted meta transaction contracts (like SAND).
    /// @return Hash for ERC1776_OPERATOR_ROLE.
    bytes32 public constant ERC1776_OPERATOR_ROLE = keccak256("ERC1776_OPERATOR_ROLE");

    /// @notice Role for business addresses that can change values like fees and royalties.
    /// @return Hash for EXCHANGE_ADMIN_ROLE.
    bytes32 public constant EXCHANGE_ADMIN_ROLE = keccak256("EXCHANGE_ADMIN_ROLE");

    /// @notice Role for business addresses that can react to emergencies and pause.
    /// @return Hash for PAUSER_ROLE.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @dev This protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Exchange contract initializer.
    /// @param admin The admin user that can grant/revoke roles, etc.
    /// @param newTrustedForwarder Address for the trusted forwarder that will execute meta transactions.
    /// @param newProtocolFeePrimary Protocol fee applied to primary markets.
    /// @param newProtocolFeeSecondary Protocol fee applied to secondary markets.
    /// @param newDefaultFeeReceiver Market fee receiver.
    /// @param newRoyaltiesProvider Registry for the different types of royalties.
    /// @param orderValidatorAddress New OrderValidator contract address.
    // solhint-disable-next-line func-name-mixedcase
    function __Exchange_init(
        address admin,
        address newTrustedForwarder,
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider,
        IOrderValidator orderValidatorAddress,
        uint256 newMatchOrdersLimit
    ) external initializer {
        __ERC2771Handler_init_unchained(newTrustedForwarder);
        __AccessControlEnumerable_init_unchained();
        __Pausable_init_unchained();
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newDefaultFeeReceiver,
            newRoyaltiesProvider
        );
        __ExchangeCoreInitialize(orderValidatorAddress, newMatchOrdersLimit);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Match orders and transact.
    /// @param matchedOrders A list of left/right orders that match each other.
    function matchOrders(ExchangeMatch[] calldata matchedOrders) external whenNotPaused {
        _matchOrders(_msgSender(), matchedOrders);
    }

    /// @notice Match orders and transact.
    /// @param sender The original sender of the transaction.
    /// @param matchedOrders A list of left/right orders that match each other.
    /// @dev This method supports ERC1776 native meta transactions.
    function matchOrdersFrom(
        address sender,
        ExchangeMatch[] calldata matchedOrders
    ) external onlyRole(ERC1776_OPERATOR_ROLE) whenNotPaused {
        require(sender != address(0), "invalid sender");
        _matchOrders(sender, matchedOrders);
    }

    /// @notice Cancel an order.
    /// @param order The order to be canceled.
    /// @param orderKeyHash Used as a checksum to avoid mistakes in the order values.
    function cancel(LibOrder.Order calldata order, bytes32 orderKeyHash) external {
        require(_msgSender() == order.maker, "not maker");
        _cancel(order, orderKeyHash);
    }

    /// @notice Set the royalty registry.
    /// @param newRoyaltiesRegistry Address of the new royalties registry.
    function setRoyaltiesRegistry(IRoyaltiesProvider newRoyaltiesRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setRoyaltiesRegistry(newRoyaltiesRegistry);
    }

    /// @notice Set the OrderValidator address.
    /// @param contractAddress New OrderValidator contract address.
    function setOrderValidatorContract(IOrderValidator contractAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setOrderValidatorContract(contractAddress);
    }

    /// @notice Set the limit for matching orders.
    /// @param newMatchOrdersLimit New value for max orders that can be matched.
    function setMatchOrdersLimit(uint256 newMatchOrdersLimit) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _setMatchOrdersLimit(newMatchOrdersLimit);
    }

    /// @notice Change the address of the trusted forwarder for meta-transactions.
    /// @param newTrustedForwarder The new trusted forwarder address.
    function setTrustedForwarder(address newTrustedForwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTrustedForwarder(newTrustedForwarder);
    }

    /// @notice Set the protocol fees.
    /// @param newProtocolFeePrimary Fee for the primary market.
    /// @param newProtocolFeeSecondary Fee for the secondary market.
    function setProtocolFee(
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary
    ) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _setProtocolFee(newProtocolFeePrimary, newProtocolFeeSecondary);
    }

    /// @notice Set the default fee receiver.
    /// @param newDefaultFeeReceiver Address to receive the fees.
    function setDefaultFeeReceiver(address newDefaultFeeReceiver) external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _setDefaultFeeReceiver(newDefaultFeeReceiver);
    }

    /// @notice Pause the contract operations.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Resume the contract operations.
    function unpause() external onlyRole(EXCHANGE_ADMIN_ROLE) {
        _unpause();
    }

    /// @dev Check if fees & royalties should be skipped for users with the EXCHANGE_ADMIN_ROLE.
    /// @param from Address to check.
    /// @return True if fees should be skipped, false otherwise.
    function _mustSkipFees(address from) internal view override returns (bool) {
        return hasRole(EXCHANGE_ADMIN_ROLE, from);
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

    // slither-disable-next-line dead-code needed because of inheritance
    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }
}
