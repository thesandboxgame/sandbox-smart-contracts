// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.18;

/// @dev minimal ERC2771 handler to keep bytecode-size down
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/metatx/ERC2771Context.sol
/// with an initializer for proxies and a mutable forwarder
abstract contract ERC2771Handler {
    address internal _trustedForwarder;

    /// @notice Emitted when a `newTrustedForwarder` is set, replacing the `oldTrustedForwarder`
    /// @param oldTrustedForwarder old trusted forwarder
    /// @param newTrustedForwarder new trusted forwarder
    /// @param operator the sender of the transaction
    event TrustedForwarderSet(
        address indexed oldTrustedForwarder,
        address indexed newTrustedForwarder,
        address indexed operator
    );

    /// @notice set the trusted forwarder address
    /// @param forwarder trusted forwarder address or zero to disable it
    function __ERC2771Handler_initialize(address forwarder) internal {
        _setTrustedForwarder(forwarder);
    }

    /// @notice return true if the forwarder is the trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    function isTrustedForwarder(address forwarder) external view returns (bool) {
        return _isTrustedForwarder(forwarder);
    }

    /// @notice return the address of the trusted forwarder
    /// @return return the address of the trusted forwarder
    function getTrustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /// @notice return the address of the trusted forwarder
    /// @dev this methods is the same as getTrustedForwarder but used by Biconomy
    /// @return return the address of the trusted forwarder
    function trustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /// @notice set the address of the trusted forwarder
    /// @param newForwarder the address of the new forwarder.
    function _setTrustedForwarder(address newForwarder) internal virtual {
        emit TrustedForwarderSet(_trustedForwarder, newForwarder, _msgSender());
        _trustedForwarder = newForwarder;
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

    /// @notice return true if the forwarder is the trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    function _isTrustedForwarder(address forwarder) internal view virtual returns (bool) {
        return forwarder == _trustedForwarder;
    }

    uint256[49] private __gap;
}
