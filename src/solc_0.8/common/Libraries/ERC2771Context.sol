// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// @dev upgradable variant of openzeppelin contract.
/// src: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol

contract ERC2771Context {
    address internal _trustedForwarder;

    function initialize(address forwarder) internal {
      _trustedForwarder = forwarder;
    }

    function isTrustedForwarder(address forwarder) public view virtual returns(bool) {
        return forwarder == _trustedForwarder;
    }

    function _msgSender() internal view virtual returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            assembly { sender := shr(96, calldataload(sub(calldatasize(), 20))) }
        } else {
            return msg.sender;
        }
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length-20];
        } else {
            return msg.data;
        }
    }
}
