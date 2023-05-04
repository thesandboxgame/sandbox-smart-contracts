//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./interfaces/IGem.sol";
import "../common/BaseWithStorage/ERC20/ERC20TokenUpgradeable.sol";

contract GemV1 is IGem, ERC20TokenUpgradeable {
    uint16 public override gemId;
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

    function __GemV1_init(
        string memory name,
        string memory symbol,
        address trustedForwarder,
        address admin,
        uint16 _gemId,
        address approver
    ) public initializer {
        __ERC20TokenUpgradeable_init(name, symbol, trustedForwarder, admin);
        gemId = _gemId;
        _grantRole(APPROVER_ROLE, approver);
    }

    /// @notice Approve `spender` to transfer `amount` tokens from `owner`.
    /// @param owner The address whose token is allowed.
    /// @param spender The address to be given rights to transfer.
    /// @param amount The number of tokens allowed.
    /// @return success Whether or not the call succeeded.
    function approveFor(
        address owner,
        address spender,
        uint256 amount
    ) external override(ERC20BaseTokenUpgradeable, IGem) returns (bool success) {
        require(
            _msgSender() == owner || hasRole(SUPER_OPERATOR_ROLE, _msgSender()) || hasRole(APPROVER_ROLE, _msgSender()),
            "NOT_AUTHORIZED"
        );
        _approveFor(owner, spender, amount);
        return true;
    }

    function getDecimals() external pure override returns (uint8) {
        return ERC20BaseTokenUpgradeable.decimals();
    }
}
