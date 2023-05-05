// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

/// @dev minimal ERC2771 handler to keep bytecode-size down.
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol

abstract contract ERC2771HandlerV2 {
    address internal _trustedForwarder;

    function __ERC2771HandlerV2_initialize(address forwarder) internal {
        _trustedForwarder = forwarder;
    }

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function getTrustedForwarder() external view returns (address trustedForwarder) {
        return _trustedForwarder;
    }

    function _msgSender() internal view virtual returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            require(msg.data.length >= 24, "ERC2771HandlerV2: Invalid msg.data");
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return msg.sender;
        }
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            require(msg.data.length >= 24, "ERC2771HandlerV2: Invalid msg.data");
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }
}
