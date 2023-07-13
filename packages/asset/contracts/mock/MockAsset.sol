//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

// mock the asset contract to test the _msgData() function

import {Asset} from "../Asset.sol";

contract MockAsset is Asset {
    function msgData() external view returns (bytes memory) {
        return _msgData();
    }
}
