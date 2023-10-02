// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibAsset} from "../lib-asset/LibAsset.sol";
import {LibFeeSide} from "../transfer-manager/lib/LibFeeSide.sol";

// TODO: MAKE THE TESTS!!!
contract LibFeeSideTest {
    function getFeeSideTest(
        LibAsset.AssetClassType maker,
        LibAsset.AssetClassType taker
    ) external pure returns (LibFeeSide.FeeSide) {
        return LibFeeSide.getFeeSide(maker, taker);
    }
}
