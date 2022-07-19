//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../Libraries/TileWithCoordLib.sol";
import {MapLib} from "../Libraries/MapLib.sol";

/// @title Interface for the Estate token on L1
interface IEstateToken {
    function contain(uint256 estateId, MapLib.TranslateResult memory s) external view returns (bool);

    function getStorageId(uint256 tokenId) external pure returns (uint256);

    function getOwnerOfStorage(uint256 estateId) external view returns (address owner);
}
