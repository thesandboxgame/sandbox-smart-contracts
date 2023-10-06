//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

// mock the asset contract to test the _msgData() function to satisfy the coverage

import {AssetReveal} from "../AssetReveal.sol";

contract MockAssetReveal is AssetReveal {
    function msgData() external view returns (bytes memory) {
        return _msgData();
    }
}
