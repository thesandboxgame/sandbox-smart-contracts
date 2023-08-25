//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {ERC1155Upgradeable, ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC2771HandlerUpgradeable} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {OperatorFiltererUpgradeable} from "../OperatorFiltererUpgradeable.sol";

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";

contract TestERC1155 is ERC1155Upgradeable, OperatorFiltererUpgradeable, ERC2771HandlerUpgradeable {
    function initialize(string memory uri_, address trustedForwarder) external initializer {
        __ERC1155_init(uri_);
        __ERC2771Handler_init(trustedForwarder);
    }

    /// @notice sets registry and subscribe to subscription
    /// @param registry address of registry
    /// @param subscription address to subscribe
    function setRegistryAndSubscribe(address registry, address subscription) external {
        _setOperatorFilterRegistry(registry);
        IOperatorFilterRegistry(registry).registerAndSubscribe(address(this), subscription);
    }

    /// @notice Mint new tokens with out minter role
    /// @param to The address of the recipient
    /// @param id The id of the token to mint
    /// @param amount The amount of the token to mint
    function mintWithoutMinterRole(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    /// @notice set approval for token transfer without filtering
    /// @param operator operator to be approved
    /// @param approved bool value for giving (true) and canceling (false) approval
    function setApprovalForAllWithoutFilter(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function msgData() external view returns (bytes memory) {
        return _msgData();
    }

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @dev call data should be optimized to order ids so packedBalance can be used efficiently.
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param amounts amount of each token type transfered.
    /// @param data aditional data accompanying the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override onlyAllowedOperator(from) {
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    /// @notice Enable or disable approval for `operator` to manage all of the caller's tokens.
    /// @param operator address which will be granted rights to transfer all tokens of the caller.
    /// @param approved whether to approve or revoke
    function setApprovalForAll(
        address operator,
        bool approved
    ) public virtual override onlyAllowedOperatorApproval(operator) {
        super.setApprovalForAll(operator, approved);
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param amount amount of token transfered.
    /// @param data aditional data accompanying the transfer.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, id, amount, data);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771HandlerUpgradeable._msgData();
    }
}
