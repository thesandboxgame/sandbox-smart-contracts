pragma solidity 0.6.5;


contract TheSandbox712 {
    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,address verifyingContract)");
    bytes32 public immutable DOMAIN_SEPARATOR;

    constructor() public {
        DOMAIN_SEPARATOR = keccak256(abi.encode(EIP712DOMAIN_TYPEHASH, keccak256("The Sandbox"), keccak256("1"), address(this)));
    }
}
