//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {
    ERC721Upgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {OperatorFiltererUpgradeable} from "../OperatorFiltererUpgradeable.sol";
import {
    ERC2771HandlerUpgradeable
} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";

contract TestERC721 is ERC721Upgradeable, OperatorFiltererUpgradeable, ERC2771HandlerUpgradeable {
    function initialize(
        string memory name_,
        string memory symbol_,
        address trustedForwarder
    ) external initializer() {
        __ERC721_init(name_, symbol_);
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
    function mintWithoutMinterRole(address to, uint256 id) external {
        _mint(to, id);
    }

    /// @notice set approval for asset transfer without filtering
    /// @param operator operator to be approved
    /// @param approved bool value for giving (true) and canceling (false) approval
    function setApprovalForAllWithoutFilter(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function msgData() external view returns (bytes memory) {
        return _msgData();
    }

    /// @notice Enable or disable approval for `operator` to manage all of the caller's tokens.
    /// @param operator address which will be granted rights to transfer all tokens of the caller.
    /// @param approved whether to approve or revoke
    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
        onlyAllowedOperatorApproval(operator)
    {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual override onlyAllowedOperator(from) {
        super.safeTransferFrom(from, to, id);
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
