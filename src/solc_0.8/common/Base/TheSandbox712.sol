//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {
    ProxyImplementation
} from "../BaseWithStorage/ProxyImplementation.sol";

contract TheSandbox712 is ProxyImplementation {
    bytes32 internal constant EIP712DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,address verifyingContract)");
    // solhint-disable-next-line var-name-mixedcase
    bytes32 public DOMAIN_SEPARATOR;

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(EIP712DOMAIN_TYPEHASH, keccak256("The Sandbox"), keccak256("1"), address(this))
        );
    }

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
