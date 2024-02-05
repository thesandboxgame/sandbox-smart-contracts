//SPDX-License-Identifier: MIT

/* solhint-disable no-empty-blocks */

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract MockERC1155Asset is ERC1155PresetMinterPauser, Ownable {
    event Bouncer(address indexed bouncer, bool indexed enabled);

    constructor(string memory uri) ERC1155PresetMinterPauser(uri) Ownable() {}

    function setBouncer(address bouncer, bool enabled) external {
        emit Bouncer(bouncer, enabled);
    }


    function mint(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256 supply,
        address owner,
        bytes calldata data) external {
        _mint(owner, packId, supply, data);
    }

    function deposit(address user, bytes calldata depositData) external {
        // solhint-disable-previous-line no-empty-blocks
    }
}
