// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC2771HandlerAbstract} from "./ERC2771HandlerAbstract.sol";

/// @dev minimal ERC2771 handler to keep bytecode-size down
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/metatx/ERC2771Context.sol
contract ERC2771HandlerUpgradeable is Initializable, ERC2771HandlerAbstract {
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
    // solhint-disable-next-line func-name-mixedcase
    function __ERC2771Handler_init(address forwarder) internal onlyInitializing {
        __ERC2771Handler_init_unchained(forwarder);
    }

    /// @notice initialize the trusted forwarder address
    /// @param forwarder trusted forwarder address or zero to disable it
    // solhint-disable-next-line func-name-mixedcase
    function __ERC2771Handler_init_unchained(address forwarder) internal onlyInitializing {
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

    uint256[49] private __gap;
}
