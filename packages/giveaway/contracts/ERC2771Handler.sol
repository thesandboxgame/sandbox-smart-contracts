// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

/// @dev minimal ERC2771 handler to keep bytecode-size down
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/metatx/ERC2771Context.sol
/// with an initializer for proxies and a mutable forwarder
abstract contract ERC2771Handler {
    address internal _trustedForwarder;

    /// @notice set the trusted forwarder address
    /// @param forwarder trusted forwarder address or zero to disable it
    function __ERC2771Handler_initialize(address forwarder) internal {
        _trustedForwarder = forwarder;
    }

    /// @notice return true if the forwarder is the assigned trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    /// @notice return true if the forwarder is the assigned trusted forwarder
    /// @return return the address of the assigned trusted forwarder
    function getTrustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /// @notice return true if the forwarder is the assigned trusted forwarder
    /// @dev used this methods is the same as getTrustedForwarder but used by Biconomy
    /// @return return the address of the assigned trusted forwarder
    function trustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /// @notice if the call is from the trusted forwarder the sender is extracted from calldata, msg.sender otherwise
    /// @return sender the calculated address of the sender
    function _msgSender() internal view virtual returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }
}
