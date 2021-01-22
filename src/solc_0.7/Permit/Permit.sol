//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../common/Interfaces/IERC20Extended.sol";
import "../Base/TheSandbox712.sol";

/// @title Permit contract
/// @notice This contract manages approvals of SAND via signature
contract Permit is TheSandbox712 {
    IERC20Extended internal immutable _sand;

    mapping(address => uint256) public nonces;

    bytes32 public constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

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
    ) public {
        require(deadline >= block.timestamp, "PAST_DEADLINE");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNATURE");
        _sand.approveFor(owner, spender, value);
    }
}
