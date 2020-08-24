pragma solidity 0.6.5;

import "./Interfaces/ERC20Extended.sol";
import "./base/TheSandbox712.sol";

/// @title Permit contract
/// @notice This contract manages approvals of SAND via signature
contract Permit is TheSandbox712 {

    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) public {
        require(deadline >= block.timestamp, 'PAST_DEADLINE');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                domainSeparator(),
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'INVALID_SIGNATURE');
        _sand.approveFor(owner, spender, value);
    }

    ERC20Extended internal immutable _sand;

    mapping(address => uint256) public nonces;

    bytes32 constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    constructor(
        ERC20Extended sandContractAddress
    ) public {
        init712();
        _sand = sandContractAddress;
    }

}
