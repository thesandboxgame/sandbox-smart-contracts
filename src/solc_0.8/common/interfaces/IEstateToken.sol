//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../Libraries/TileWithCoordLib.sol";
import "../Libraries/MapLib.sol";

/// @title Interface for the Estate token on L1
interface IEstateToken {
    struct EstateCRUDData {
        MapLib.QuadsAndTiles freeLandData; //(size, x, y)
        bytes32 uri;
    }

    struct UpdateEstateLands {
        MapLib.QuadsAndTiles landToAdd;
        uint256[][3] landToRemove;
        uint256 estateId;
        bytes32 uri;
    }

    function createEstate(address from, EstateCRUDData calldata data) external returns (uint256);

    function updateLandsEstate(address from, UpdateEstateLands calldata data) external returns (uint256);

    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) external returns (uint256);

    function burnEstate(address from, uint256 estateId)
        external
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles);
}
