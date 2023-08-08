//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {
    ERC721Upgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {OperatorFiltererUpgradeable, ERC2771HandlerAbstract} from "../OperatorFiltererUpgradeable.sol";
import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";

contract TestERC721 is ERC721Upgradeable, OperatorFiltererUpgradeable {
    address private _trustedForwarder;

    function initialize(
        string memory name_,
        string memory symbol_,
        address trustedForwarder
    ) external initializer() {
        __ERC721_init(name_, symbol_);
        _trustedForwarder = trustedForwarder;
    }

    /// @notice sets registry and subscribe to subscription
    /// @param registry address of registry
    /// @param subscription address to subscribe
    function setRegistryAndSubscribe(address registry, address subscription) external {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
        operatorFilterRegistry.registerAndSubscribe(address(this), subscription);
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

    /// @notice Set a new trusted forwarder address, limited to DEFAULT_ADMIN_ROLE only
    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external {
        require(trustedForwarder != address(0), "Asset: trusted forwarder can't be zero address");
        _setTrustedForwarder(trustedForwarder);
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

    /// @notice return the address of the trusted forwarder
    /// @return return the address of the trusted forwarder
    function getTrustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /// @notice set the address of the trusted forwarder
    /// @param newForwarder the address of the new forwarder.
    function _setTrustedForwarder(address newForwarder) internal virtual {
        require(newForwarder != _trustedForwarder, "ERC2771HandlerUpgradeable: forwarder already set");
        _trustedForwarder = newForwarder;
    }

    /// @notice return true if the forwarder is the trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    function _isTrustedForwarder(address forwarder) internal view virtual override returns (bool) {
        return forwarder == _trustedForwarder;
    }
}
