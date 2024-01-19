// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {MarketPlaceMock} from "./MarketPlaceMock.sol";

///@dev same as MockMarketPlace but with different codeHash
contract MarketPlaceToFilterMock is MarketPlaceMock {
    function doNothing() external pure returns (uint256) {
        return 123;
    }
}
