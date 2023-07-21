// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {RoyaltyDistributer} from "../RoyaltyDistributer.sol";

contract SingleReceiver is ERC1155Upgradeable, RoyaltyDistributer {
    /// @notice initiliaze to be called by the proxy
    /// @dev would run once.
    /// @param _manager, the address of the Manager contract for common royalty recipient
    function initialize(address _manager) external initializer {
        __RoyaltyDistributer_init(_manager);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155Upgradeable, RoyaltyDistributer)
        returns (bool)
    {
        return ERC1155Upgradeable.supportsInterface(interfaceId) || RoyaltyDistributer.supportsInterface(interfaceId);
    }
}
