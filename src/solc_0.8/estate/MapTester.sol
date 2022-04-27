//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {MapLib} from "../common/Libraries/MapLib.sol"; // TODO: Separate this code into a library + something to store the masks

// TODO: Check if a pure function is better than a mapping for the masks
contract MapTester {
    using MapLib for MapLib.Map;
    mapping(uint256 => uint256) public quadMap;
    MapLib.Map[30] maps;

    constructor() {
        quadMap[1] = 1;
        quadMap[3] = 2 ** 3 - 1;
        quadMap[6] = 2 ** 6 - 1;
        quadMap[12] = 2 ** 12 - 1;
        quadMap[24] = 2 ** 24 - 1;
    }

    function quadMask(uint256 size) external view returns (uint256) {
        return _quadMask(size);
    }

    // TODO: ....

    function _quadMask(uint256 size) internal view returns (uint256) {
        return quadMap[size];
    }

}
