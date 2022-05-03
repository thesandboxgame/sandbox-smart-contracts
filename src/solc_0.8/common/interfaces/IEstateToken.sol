//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../Libraries/TileWithCoordLib.sol";

/// @title Interface for the Estate token on L1
interface IEstateToken {
    struct EstateCRUDData {
        uint256[][3] quadTuple; //(size, x, y)
        TileWithCoordLib.TileWithCoord[] tiles;
        /* uint256[] landIds;
        uint256[] gameIds; */
        bytes32 uri;
    }

    struct UpdateEstateLands {
        uint256[][3] quadsToAdd;
        TileWithCoordLib.TileWithCoord[] tilesToAdd;
        uint256[][3] quadsToRemove;
        uint256 estateId;
        bytes32 uri;
    }

    function createEstate(address from, EstateCRUDData calldata creation) external returns (uint256);

    function updateLandsEstate(address from, UpdateEstateLands calldata update) external returns (uint256);
}
