// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";
import {IAssetMatcher} from "../interfaces/IAssetMatcher.sol";
import {TransferManager, IRoyaltiesProvider} from "../transfer-manager/TransferManager.sol";
import {ExchangeCore} from "./ExchangeCore.sol";

/// @title Exchange contract with meta transactions
/// @notice Used to exchange assets, that is, tokens.
/// @dev Main functions are in ExchangeCore
/// @dev TransferManager is used to execute token transfers
contract Exchange is Initializable, OwnableUpgradeable, ExchangeCore, TransferManager, ERC2771HandlerUpgradeable {
    /// @notice Exchange contract initializer
    /// @param newTrustedForwarder address for trusted forwarder that will execute meta transactions
    /// @param newProtocolFeePrimary protocol fee applied for primary markets
    /// @param newProtocolFeeSecondary protocol fee applied for secondary markets
    /// @param newDefaultFeeReceiver market fee receiver
    /// @param newRoyaltiesProvider registry for the different types of royalties
    /// @param orderValidatorAddress address of the OrderValidator contract, that validates orders
    /// @param newNativeOrder bool to indicate of the contract accepts or doesn't native tokens, i.e. ETH or Matic
    /// @param newMetaNative same as =nativeOrder but for metaTransactions
    function __Exchange_init(
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
        // TODO: Switch to a version that takes an admin address
        __Ownable_init_unchained();
        __TransferManager_init_unchained(
            newProtocolFeePrimary,
            newProtocolFeeSecondary,
            newDefaultFeeReceiver,
            newRoyaltiesProvider
        );
        __ExchangeCoreInitialize(newNativeOrder, newMetaNative, orderValidatorAddress);
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
