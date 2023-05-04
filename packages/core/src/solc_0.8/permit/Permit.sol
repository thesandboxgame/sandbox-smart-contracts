//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IERC20Extended.sol";
import "../common/BaseWithStorage/WithPermit.sol";

/// @title Permit contract
/// @notice This contract manages approvals of SAND via signature
contract Permit is WithPermit {
    IERC20Extended internal immutable _sand;

    constructor(IERC20Extended sandContractAddress) {
        _sand = sandContractAddress;
    }

    /// @notice Permit the expenditure of SAND by a nominated spender.
    /// @param owner The owner of the ERC20 tokens.
    /// @param spender The nominated spender of the ERC20 tokens.
    /// @param value The value (allowance) of the ERC20 tokens that the nominated.
    /// spender will be allowed to spend.
    /// @param deadline The deadline for granting permission to the spender.
    /// @param v The final 1 byte of signature.
    /// @param r The first 32 bytes of signature.
    /// @param s The second 32 bytes of signature.
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
        _sand.approveFor(owner, spender, value);
    }
}
