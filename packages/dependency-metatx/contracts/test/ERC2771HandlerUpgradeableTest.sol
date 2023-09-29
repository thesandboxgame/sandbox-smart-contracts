// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

import {ERC2771HandlerUpgradeable} from "../ERC2771HandlerUpgradeable.sol";

contract ERC2771HandlerUpgradeableTest is ERC2771HandlerUpgradeable {
    function initialize(address trustedForwarder) external initializer {
        __ERC2771Handler_init_unchained(trustedForwarder);
    }

    function initialize2(address trustedForwarder) external initializer {
        __ERC2771Handler_init(trustedForwarder);
    }

    function initialize3(address trustedForwarder) external {
        __ERC2771Handler_init(trustedForwarder);
    }

    function initialize4(address trustedForwarder) external {
        __ERC2771Handler_init_unchained(trustedForwarder);
    }

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
