//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity ^0.8.2;

contract MockTrustedForwarder {
    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gasLimit;
        bytes data;
    }

    function execute(ForwardRequest calldata req) public payable returns (bool, bytes memory) {
        (bool success, bytes memory returndata) = req.to.call{gas: req.gasLimit, value: req.value}(
            abi.encodePacked(req.data, req.from)
        );
        assert(gasleft() > req.gasLimit / 63);
        return (success, returndata);
    }
}
