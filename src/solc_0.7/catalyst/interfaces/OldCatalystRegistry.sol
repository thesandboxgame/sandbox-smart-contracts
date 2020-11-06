//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

interface OldCatalystRegistry {
    function getCatalyst(uint256 assetId) external view returns (bool exists, uint256 catalystId);
}
