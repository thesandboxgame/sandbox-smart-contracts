//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ILandToken.sol";

interface ILandTokenWithIsSuperOperator is ILandToken {
    function isSuperOperator(address who) external view returns (bool);
}
