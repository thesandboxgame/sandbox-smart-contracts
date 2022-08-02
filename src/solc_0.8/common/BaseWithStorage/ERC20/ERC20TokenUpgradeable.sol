//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ERC20BaseTokenUpgradeable.sol";
import "../WithPermitUpgradeable.sol";
import "../ERC677/extensions/ERC677Extension.sol";
import "../../interfaces/IERC677Receiver.sol";

contract ERC20TokenUpgradeable is ERC677Extension, WithPermitUpgradeable, ERC20BaseTokenUpgradeable {
    function __ERC20TokenUpgradeable_init(
        string memory name,
        string memory symbol,
        address trustedForwarder,
        address admin
    ) public initializer {
        __ERC20BaseTokenUpgradeable_init(name, symbol, trustedForwarder, admin);
        __WithPermitUpgradeable_init("The Sandbox");
    }

    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _mint(to, amount);
    }

    /// @notice Function to permit the expenditure of ERC20 token by a nominated spender
    /// @param owner The owner of the ERC20 tokens
    /// @param spender The nominated spender of the ERC20 tokens
    /// @param value The value (allowance) of the ERC20 tokens that the nominated spender will be allowed to spend
    /// @param deadline The deadline for granting permission to the spender
    /// @param v The final 1 byte of signature
    /// @param r The first 32 bytes of signature
    /// @param s The second 32 bytes of signature
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override {
        checkApproveFor(owner, spender, value, deadline, v, r, s);
        _approveFor(owner, spender, value);
    }

    function _msgSender() internal view override(Context, ERC20BaseTokenUpgradeable) returns (address sender) {
        return ERC2771ContextUpgradeable._msgSender();
    }

    function _msgData() internal view override(Context, ERC20BaseTokenUpgradeable) returns (bytes calldata) {
        return ERC2771ContextUpgradeable._msgData();
    }

    uint256[50] private __gap;
}
