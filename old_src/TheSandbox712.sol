pragma solidity 0.5.9;

import {
    ProxyImplementation
} from "../contracts_common/src/BaseWithStorage/ProxyImplementation.sol";

contract TheSandbox712 is ProxyImplementation {
    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,address verifyingContract)"
    );
    bytes32 DOMAIN_SEPARATOR;

    function init712() public phase("712") {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256("The Sandbox 3D"),
                keccak256("1"),
                address(this)
            )
        );
    }

    function domainSeparator() internal view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }
}
