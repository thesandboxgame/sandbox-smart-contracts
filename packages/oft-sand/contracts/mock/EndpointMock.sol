// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {EndpointV2Mock} from "@layerzerolabs/test-devtools-evm-hardhat/contracts/mocks/EndpointV2Mock.sol";

contract EndpointMock is EndpointV2Mock {
    constructor(uint32 eid) EndpointV2Mock(eid) {}
}
