// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../lib-asset/LibAsset.sol";

contract LibFeeSideTest {
    function getFeeSideTest(
        LibAsset.AssetClassType maker,
        LibAsset.AssetClassType taker
    ) external pure returns (LibAsset.FeeSide) {
        return LibAsset.getFeeSide(maker, taker);
    }
}
