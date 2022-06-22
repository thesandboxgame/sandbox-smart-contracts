//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;
import "../test/ERC721Mintable.sol";
import {TileLib} from "../common/Libraries/TileLib.sol";

contract MockExperience is ERC721Mintable {
    using TileLib for TileLib.Tile;
    TileLib.Tile internal tile;
    uint256[] public landCoords;

    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721Mintable("Experience", "Exp") {}

    function setQuad(
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tile = tile.set(x, y, size);
        landCoords = [x, y]; //? this will have to be top last always
    }

    function getTemplate() external view returns (TileLib.Tile memory, uint256[] memory landCoords) {
        return (tile, landCoords);
    }
}
