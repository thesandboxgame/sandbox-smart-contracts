//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../Libraries/TileWithCoordLib.sol";
import "./IEstateToken.sol";
import "../Libraries/MapLib.sol";

/// @title Interface for the Estate token

interface IPolygonEstateToken {
    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) external returns (uint256);

    function burnEstate(address from, uint256 estateId)
        external
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles);
}
