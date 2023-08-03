// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

import {ERC2771Handler} from "../ERC2771Handler.sol";

contract ERC2771HandlerTest is ERC2771Handler {
    // solhint-disable-next-line no-empty-blocks
    constructor(address forwarder) ERC2771Handler(forwarder) {}

    function setTrustedForwarder(address forwarder) external {
        _setTrustedForwarder(forwarder);
    }

    function getSender() external view returns (address) {
        return _msgSender();
    }

    function getData() external view returns (bytes calldata) {
        return _msgData();
    }
}
