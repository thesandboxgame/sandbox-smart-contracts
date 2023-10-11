// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {MinimalForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

contract TrustedForwarderMock is MinimalForwarder {
    constructor() MinimalForwarder() {}

    //Expand function execute and treat error
    function executeV(ForwardRequest calldata req, bytes calldata signature) public payable returns (bytes memory) {
        bool success;
        bytes memory returndata;
        (success, returndata) = MinimalForwarder.execute(req, signature);
        require(success, "meta transaction failed");
        return returndata;
    }

    function execute(ForwardRequest calldata req) public payable returns (bool, bytes memory) {
        (bool success, bytes memory returndata) = req.to.call{gas: req.gas, value: req.value}(
            abi.encodePacked(req.data, req.from)
        );
        assert(gasleft() > req.gas / 63);
        require(success, "Call execution failed");
        return (success, returndata);
    }
}
