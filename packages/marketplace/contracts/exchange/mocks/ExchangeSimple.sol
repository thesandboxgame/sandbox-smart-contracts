// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ExchangeCore} from "../ExchangeCore.sol";
import {SimpleTransferManager} from "./SimpleTransferManager.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";

contract ExchangeSimple is ExchangeCore, SimpleTransferManager, ERC2771HandlerUpgradeable {
    function __ExchangeSimple_init(
        address _orderValidatorAdress,
        bool _nativeOrder,
        bool _metaNative
    ) external initializer {
        __Ownable_init();
        __ExchangeCoreInitialize(_nativeOrder, _metaNative, _orderValidatorAdress);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ERC2771HandlerUpgradeable, ContextUpgradeable)
        returns (address)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    function _msgData() internal view override(ERC2771HandlerUpgradeable, ContextUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }
}