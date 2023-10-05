// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @dev minimal ERC2771 handler to keep bytecode-size down
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol
abstract contract ERC2771HandlerAbstract {
    /// @notice return true if the forwarder is the trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    function isTrustedForwarder(address forwarder) external view returns (bool) {
        return _isTrustedForwarder(forwarder);
    }

    /// @notice if the call is from the trusted forwarder the sender is extracted from calldata, msg.sender otherwise
    /// @return sender the calculated address of the sender
    function _msgSender() internal view virtual returns (address sender) {
        if (_isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            // solhint-disable-next-line no-inline-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }

    /// @notice if the call is from the trusted forwarder the sender is removed from calldata
    /// @return the calldata without the sender
    function _msgData() internal view virtual returns (bytes calldata) {
        if (_isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }

    /// @notice return true if the forwarder is the trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    /// @dev this function must be IMPLEMENTED
    function _isTrustedForwarder(address forwarder) internal view virtual returns (bool);
}
