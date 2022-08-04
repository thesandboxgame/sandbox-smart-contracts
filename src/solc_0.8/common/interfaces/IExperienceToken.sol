//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {TileOrLandLib} from "../Libraries/TileOrLandLib.sol";

interface IExperienceToken {
    function getTemplate(uint256 expId) external view returns (TileOrLandLib.TileOrLand calldata);

    function getStorageId(uint256 expId) external view returns (uint256 storageId);
}
