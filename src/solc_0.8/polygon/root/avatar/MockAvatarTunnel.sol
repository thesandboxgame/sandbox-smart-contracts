// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AvatarTunnel} from "./AvatarTunnel.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";

contract MockAvatarTunnel is AvatarTunnel {
    constructor(
        address _checkpointManager,
        address _fxRoot,
        IERC721 _rootAvatarToken,
        address _trustedForwarder
    )
        AvatarTunnel(_checkpointManager, _fxRoot, _rootAvatarToken, _trustedForwarder) // solhint-disable no-empty-blocks
    {}

    function processMessageFromChild(bytes memory message) external {
        _processMessageFromChild(message);
    }
}
