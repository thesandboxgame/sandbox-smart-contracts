//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./IPolygonLand.sol";

interface IPolygonLandWithIsSuperOperator is IPolygonLand {
    function isSuperOperator(address who) external view returns (bool);
}
