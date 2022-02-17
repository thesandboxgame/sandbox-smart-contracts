// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../common/interfaces/IPolygonLand.sol";

// solhint-disable

/// @dev This is NOT a secure FxRoot contract implementation!
/// DO NOT USE in production.

interface IFakeFxChild {
    function onStateReceive(
        uint256 stateId,
        address receiver,
        address rootMessageSender,
        bytes memory data
    ) external;
}

/**
 * @title FxRoot root contract for fx-portal
 */
contract FakeFxRoot {
    address fxChild;

    function setFxChild(address _fxChild) public {
        fxChild = _fxChild;
    }

    function sendMessageToChild(address _receiver, bytes calldata _data) public {
        IFakeFxChild(fxChild).onStateReceive(0, _receiver, msg.sender, _data);
    }
}
