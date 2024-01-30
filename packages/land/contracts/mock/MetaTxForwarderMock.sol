// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

contract MetaTxForwarderMock {
    event TXResult(bool success, bytes returndata);

    function execute(address from, address to, bytes calldata data) public payable returns (bytes memory) {
        return Address.functionCall(to, abi.encodePacked(data, from));
    }
}
