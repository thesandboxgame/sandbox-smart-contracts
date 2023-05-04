//SPDX-License-Identifier: MIT

/* solhint-disable no-empty-blocks */

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract MockERC1155Asset is ERC1155PresetMinterPauser, Ownable {
    constructor(string memory uri) ERC1155PresetMinterPauser(uri) Ownable() {}
}
