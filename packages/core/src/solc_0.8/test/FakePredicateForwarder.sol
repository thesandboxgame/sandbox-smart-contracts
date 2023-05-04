//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

/// @dev This is NOT a secure forwarder contract implementation!
/// DO NOT USE in production.
contract FakePredicateForwarder {
    struct Request {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        bytes data;
    }

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    function forward(Request calldata req) public returns (bool, bytes memory) {
        // solhint-disable avoid-low-level-calls
        (bool success, bytes memory returndata) =
            req.to.call{gas: req.gas, value: req.value}(abi.encodePacked(req.data, req.from));
        // solhint-enable avoid-low-level-calls

        return (success, returndata);
    }
}
