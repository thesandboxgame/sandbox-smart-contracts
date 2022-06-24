//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;
import "../test/ERC721Mintable.sol";
import {TileLib} from "../common/Libraries/TileLib.sol";
import {EnumerableSet} from "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

contract MockExperience is ERC721Mintable {
    using TileLib for TileLib.Tile;
    using EnumerableSet for EnumerableSet.UintSet;
    TileLib.Tile internal tile;
    uint256[] public landCoords;
    EnumerableSet.UintSet internal landIds;

    // solhint-disable-next-line no-empty-blocks
    constructor() ERC721Mintable("Experience", "Exp") {}

    function setQuad(
        uint256 x,
        uint256 y,
        uint256 size
    ) external {
        tile = tile.set(x, y, size);
        landCoords = [x, y];
    }

    function setLands(uint256[] memory newLands) external {
        for (uint256 i = 0; i < newLands.length; i++) {
            if (!landIds.contains(newLands[i])) {
                landIds.add(newLands[i]);
                console.log("okok");
                console.log(newLands[i]);
            } else {
                console.log("why aren't you saving");
            }
        }
    }

    function getTemplate() external view returns (TileLib.Tile memory template, uint256[] memory landList) {
        return (tile, landIds.values());
    }

    function getLandIds() external view returns (uint256[] memory landList) {
        return landIds.values();
    }
}
