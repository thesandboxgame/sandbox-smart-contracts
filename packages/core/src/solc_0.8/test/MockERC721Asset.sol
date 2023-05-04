//SPDX-License-Identifier: MIT

/* solhint-disable no-empty-blocks */

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract MockERC721Asset is ERC721PresetMinterPauserAutoId, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC721PresetMinterPauserAutoId(name, symbol, uri) Ownable() {}
}
