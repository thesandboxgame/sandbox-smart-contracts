//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ERC20BaseTokenUpgradeable.sol";
//import "../WithPermit.sol";
//import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";
import "../WithPermitUpgradable.sol";
import "../ERC677/extensions/ERC677Extension.sol";
import "../../interfaces/IERC677Receiver.sol";
import "hardhat/console.sol";

contract ERC20UpgradableToken is
    ERC677Extension,
    WithPermitUpgradable, /* WithPermit */
    ERC20BaseTokenUpgradeable
{
    function __ERC20UpgradableToken_init(
        string memory name,
        string memory symbol,
        address trustedForwarder,
        address admin
    ) public initializer {
        __ERC20BaseTokenUpgradeable_init(name, symbol, trustedForwarder, admin);
        __WithPermitUpgradable_init("The Sandbox");
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
        bytes32 s /* override */
    ) public {
        checkApproveFor(owner, spender, value, deadline, v, r, s);
        _approveFor(owner, spender, value);
    }

    uint256[50] private __gap;
}
