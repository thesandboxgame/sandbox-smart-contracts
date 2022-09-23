//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract TheSandbox712 {
    bytes32 internal constant EIP712DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    // solhint-disable-next-line var-name-mixedcase
    bytes32 public immutable _DOMAIN_SEPARATOR;

    constructor() {
        _DOMAIN_SEPARATOR = keccak256(
            // chainId 137 = Polygon
            abi.encode(EIP712DOMAIN_TYPEHASH, keccak256("The Sandbox"), keccak256("1"), block.chainid, address(this))
        );
    }
}
