// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {MinimalForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

contract TestMinimalForwarder is MinimalForwarder {
    constructor() MinimalForwarder() {}

    //Expand function execute and treat error
    function executeV(ForwardRequest calldata req, bytes calldata signature) public payable returns (bytes memory) {
        bool success;
        bytes memory returndata;
        (success, returndata) = MinimalForwarder.execute(req, signature);
        require(success, "meta transaction failed");
        return returndata;
    }
}
