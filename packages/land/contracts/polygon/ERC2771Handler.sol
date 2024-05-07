// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title ERC2771Handler
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Handle meta-transactions
/// @dev minimal ERC2771 handler to keep bytecode-size down
/// @dev based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/metatx/ERC2771Context.sol
/// @dev with an initializer for proxies and a mutable forwarder
abstract contract ERC2771Handler {
    /// @notice emitted when a new trusted forwarder is set
    /// @param newForwarder the new trusted forwarder
    event TrustedForwarderSet(address indexed newForwarder);

    /// @notice Checks if an address is a trusted forwarder
    /// @param forwarder address to check
    /// @return is trusted
    function isTrustedForwarder(address forwarder) external view returns (bool) {
        return _isTrustedForwarder(forwarder);
    }

    /// @notice Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function _setTrustedForwarder(address trustedForwarder) internal {
        _writeTrustedForwarder(trustedForwarder);
        emit TrustedForwarderSet(trustedForwarder);
    }

    /// @notice Get the current trusted forwarder
    /// @return trustedForwarder address of the trusted forwarder
    function getTrustedForwarder() external view returns (address) {
        return _readTrustedForwarder();
    }

    /// @dev if the call comes from the trusted forwarder, it gets the real sender by checking the encoded address in the data
    /// @return sender address of the real sender
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

    /// @notice Checks if an address is a trusted forwarder
    /// @param trustedForwarder address to check
    /// @return is trusted
    function _isTrustedForwarder(address trustedForwarder) internal view returns (bool) {
        return trustedForwarder == _readTrustedForwarder();
    }

    /// @notice get the address of the ERC2771 trusted forwarder
    /// @return the address of the trusted forwarder
    function _readTrustedForwarder() internal view virtual returns (address);

    /// @notice set the address of the ERC2771 trusted forwarder
    /// @param trustedForwarder the address of the trusted forwarder
    function _writeTrustedForwarder(address trustedForwarder) internal virtual;
}
