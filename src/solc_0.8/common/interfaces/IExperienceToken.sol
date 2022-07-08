//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {TileLib} from "../Libraries/TileLib.sol";

interface IExperienceToken {
    function getTemplate(uint256 expId) external view returns (TileLib.Tile calldata, uint256[] calldata landCoords);

    function getStorageId(uint256 expId) external view returns (uint256 storageId);
}
