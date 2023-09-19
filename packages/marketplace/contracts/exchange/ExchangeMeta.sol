// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ExchangeCore} from "./ExchangeCore.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {ERC2771ContextUpgradeable, ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {TransferManager, IRoyaltiesProvider} from "../transfer-manager/TransferManager.sol";

/// @title Exchange contract with meta transactions
/// @notice Used to exchange assets, that is, tokens.
/// @dev Main functions are in ExchangeCore
/// @dev TransferManager is used to execute token transfers
contract ExchangeMeta is ExchangeCore, TransferManager, ERC2771HandlerUpgradeable {
    /// @notice ExchangeMeta contract initializer
    /// @param newTrustedForwarder address for trusted forwarder that will execute meta transactions
    /// @param newProtocolFeePrimary protocol fee applied for primary markets
    /// @param newProtocolFeeSecondary protocol fee applied for secondary markets
    /// @param newDefaultFeeReceiver market fee receiver
    /// @param newRoyaltiesProvider registry for the different types of royalties
    /// @param orderValidatorAdress address of the OrderValidator contract, that validates orders
    /// @param newNativeOrder bool to indicate of the contract accepts or doesn't native tokens, i.e. ETH or Matic
    /// @param newMetaNative same as =nativeOrder but for metaTransactions
    function __Exchange_init(
        address newTrustedForwarder,
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider,
        address orderValidatorAdress,
        bool newNativeOrder,
        bool newMetaNative
    ) external initializer {
        __ERC2771Handler_init(newTrustedForwarder);
        __Ownable_init();
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newDefaultFeeReceiver,
            newRoyaltiesProvider
        );
        __ExchangeCoreInitialize(newNativeOrder, newMetaNative, orderValidatorAdress);
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

    /// @notice Change the address of the trusted forwarder for meta-transactions
    /// @param newTrustedForwarder The new trustedForwarder
    function setTrustedForwarder(address newTrustedForwarder) public virtual onlyOwner {
        require(newTrustedForwarder != address(0), "address must be different from 0");

        _setTrustedForwarder(newTrustedForwarder);
    }
}
