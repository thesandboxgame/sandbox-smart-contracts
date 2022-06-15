//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {TileWithCoordLib} from "../Libraries/TileWithCoordLib.sol";

/// @title Interface for the Estate token on L1
interface IEstateToken {
    function mintEstate(
        address from,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) external returns (uint256);

    function burnEstate(address from, uint256 estateId)
        external
        returns (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles);

    function containsShiftResult(uint256 estateId, TileWithCoordLib.ShiftResult memory shiftResult)
        external
        view
        returns (bool);

    function getStorageId(uint256 tokenId) external pure returns (uint256);
}
