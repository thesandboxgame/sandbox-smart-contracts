// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ExchangeCore} from "./ExchangeCore.sol";
import {TransferManager, IRoyaltiesProvider} from "../transfer-manager/TransferManager.sol";

/// @title Exchange contract
/// @notice Used to exchange assets, that is, tokens.
/// @dev Main functions are in ExchangeCore
/// @dev TransferManager is used to execute token transfers
contract Exchange is ExchangeCore, TransferManager {
    /// @notice Exchange contract initializer
    /// @param newProtocolFeePrimary protocol fee applied for primary markets
    /// @param newProtocolFeeSecondary protocol fee applied for secondary markets
    /// @param newDefaultFeeReceiver market fee receiver
    /// @param newRoyaltiesProvider registry for the different types of royalties
    /// @param orderValidatorAdress address of the OrderValidator contract, that validates orders
    /// @param newNativeOrder bool to indicate of the contract accepts or doesn't native tokens, i.e. ETH or Matic
    /// @param newMetaNative same as =nativeOrder but for metaTransactions
    function __Exchange_init(
        uint256 newProtocolFeePrimary,
        uint256 newProtocolFeeSecondary,
        address newDefaultFeeReceiver,
        IRoyaltiesProvider newRoyaltiesProvider,
        address orderValidatorAdress,
        bool newNativeOrder,
        bool newMetaNative
    ) external initializer {
        __Ownable_init();
        __ExchangeCoreInitialize(newNativeOrder, newMetaNative, orderValidatorAdress);
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newDefaultFeeReceiver,
            newRoyaltiesProvider
        );
    }
}
