//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./IPolygonLand.sol";

interface IPolygonLandWithSetApproval is IPolygonLand {
    function setApprovalForAll(address operator, bool approved) external;
}
