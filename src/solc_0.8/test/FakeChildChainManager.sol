//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../polygon/child/asset/PolygonAssetV2.sol";
import "../polygon/child/sand/PolygonSand.sol";

/// @dev This is NOT a secure ChildChainManager contract implementation!
/// DO NOT USE in production.

contract FakeChildChainManager {
    address public polygonAsset;
    address public polygonSand;

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    function setPolygonAsset(address _polygonAsset) external {
        polygonAsset = _polygonAsset;
    }
    
    function setPolygonSand(address _polygonSand) external {
        polygonSand = _polygonSand;
    }

    function callDeposit(address user, bytes calldata depositData) external {
        PolygonAssetV2(polygonAsset).deposit(user, depositData);
    }

    function callSandDeposit(address user, bytes calldata depositData) external {
        PolygonSand(polygonSand).deposit(user, depositData);
    }
}
