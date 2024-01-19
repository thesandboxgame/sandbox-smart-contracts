// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract MetaTxForwarderMock {
    event TXResult(bool success, bytes returndata);

    function execute(address from, address to, bytes calldata data) public payable returns (bytes memory) {
        return AddressUpgradeable.functionCall(to, abi.encodePacked(data, from));
    }
}
