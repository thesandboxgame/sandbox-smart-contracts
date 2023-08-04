// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC2771HandlerAbstract} from "./ERC2771HandlerAbstract.sol";

/// @dev minimal ERC2771 handler to keep bytecode-size down
/// @dev in this abstract class we don't force an immutable/mutable trusted forwarder storage
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol
contract ERC2771Handler is ERC2771HandlerAbstract {
    address private _trustedForwarder;

    /// @notice Emitted when a `newTrustedForwarder` is set, replacing the `oldTrustedForwarder`
    /// @param oldTrustedForwarder old trusted forwarder
    /// @param newTrustedForwarder new trusted forwarder
    /// @param operator the sender of the transaction
    event TrustedForwarderSet(
        address indexed oldTrustedForwarder,
        address indexed newTrustedForwarder,
        address indexed operator
    );

    /// @notice initialize the trusted forwarder address
    /// @param forwarder trusted forwarder address or zero to disable it
    constructor(address forwarder) {
        _setTrustedForwarder(forwarder);
    }

    /// @notice return the address of the trusted forwarder
    /// @return return the address of the trusted forwarder
    function getTrustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /// @notice set the address of the trusted forwarder
    /// @param newForwarder the address of the new forwarder.
    function _setTrustedForwarder(address newForwarder) internal virtual {
        emit TrustedForwarderSet(_trustedForwarder, newForwarder, _msgSender());
        _trustedForwarder = newForwarder;
    }

    /// @notice return true if the forwarder is the trusted forwarder
    /// @param forwarder trusted forwarder address to check
    /// @return true if the address is the same as the trusted forwarder
    function _isTrustedForwarder(address forwarder) internal view virtual override returns (bool) {
        return forwarder == _trustedForwarder;
    }

    /// @notice if the call is from the trusted forwarder the sender is extracted from calldata, msg.sender otherwise
    /// @return sender the calculated address of the sender
    function _msgSender() internal view virtual override returns (address sender) {
        return super._msgSender();
    }

    /// @notice if the call is from the trusted forwarder the sender is removed from calldata
    /// @return the calldata without the sender
    function _msgData() internal view virtual override returns (bytes calldata) {
        return super._msgData();
    }
}
