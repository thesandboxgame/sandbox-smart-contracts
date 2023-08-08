// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {
    ERC1155Upgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {RoyaltyDistributor} from "../RoyaltyDistributor.sol";
import {
    ERC2771HandlerUpgradeable,
    ERC2771HandlerAbstract
} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";

contract SingleReceiver is ERC1155Upgradeable, RoyaltyDistributor, ERC2771HandlerUpgradeable {
    /// @notice initiliaze to be called by the proxy
    /// @dev would run once.
    /// @param _manager, the address of the Manager contract for common royalty recipient
    function initialize(address _manager, address trustedForwarder) external initializer {
        __RoyaltyDistributor_init(_manager);
        __ERC2771Handler_init(trustedForwarder);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, RoyaltyDistributor)
        returns (bool)
    {
        return ERC1155Upgradeable.supportsInterface(interfaceId) || RoyaltyDistributor.supportsInterface(interfaceId);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerAbstract)
        returns (address sender)
    {
        return ERC2771HandlerAbstract._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerAbstract)
        returns (bytes calldata)
    {
        return ERC2771HandlerAbstract._msgData();
    }
}
