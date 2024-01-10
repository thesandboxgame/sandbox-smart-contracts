//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./MockMarketPlace.sol";

///@dev same as MockMarketPlace but with different codeHash
contract MockMarketPlaceToFilter is MockMarketPlace {
    function doNothing() external pure returns (uint256) {
        return 123;
    }
}
