// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title ERC2771Handler
/// @author The Sandbox
/// @notice Handle meta-transactions
/// @dev minimal ERC2771 handler to keep bytecode-size down
/// @dev based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/metatx/ERC2771Context.sol
/// @dev with an initializer for proxies and a mutable forwarder
abstract contract ERC2771Handler {
    event TrustedForwarderSet(address indexed newForwarder);

    /// @dev Initializes the contract
    /// @param forwarder trusted forwarder address
    // solhint-disable-next-line func-name-mixedcase
    function __ERC2771Handler_initialize(address forwarder) internal {
        _writeTrustedForwarder(forwarder);
        emit TrustedForwarderSet(forwarder);
    }

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

    /// @notice if the call comes from the trusted forwarder, it subtracts the sender address from `msg.data` to get the real `msg.data`
    /// @return the real `msg.data`
    function _msgData() internal view virtual returns (bytes calldata) {
        if (_isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
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
