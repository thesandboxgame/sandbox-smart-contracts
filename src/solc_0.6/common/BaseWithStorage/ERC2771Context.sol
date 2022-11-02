// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.6.9;

import "./Context.sol";

/// @dev Adapted to solc 0.6.9.
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol

abstract contract ERC2771Context is Context {
    address internal _trustedForwarder;

    function __ERC2771Context_initialize(address forwarder) internal {
        _trustedForwarder = forwarder;
    }

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function getTrustedForwarder() external view returns (address trustedForwarder) {
        return _trustedForwarder;
    }

    function _msgSender() internal view virtual override returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            require(msg.data.length >= 24, "ERC2771Context: Invalid msg.data");
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    function _msgData() internal view virtual override returns (bytes calldata ret) {
        if (isTrustedForwarder(msg.sender)) {
            require(msg.data.length >= 24, "ERC2771Context: Invalid msg.data");
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }
}
