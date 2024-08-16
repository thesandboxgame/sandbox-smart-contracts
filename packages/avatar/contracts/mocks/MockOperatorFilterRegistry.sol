// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {Ownable} from "@openzeppelin/contracts-0.8.15/access/Ownable.sol";

contract MockOperatorFilterRegistry {
    /// @notice Emitted when a registration is updated.
    event RegistrationUpdated(address indexed registrant, bool indexed registered);

    /// @notice Emitted when the caller is not the address or EIP-173 "owner()"
    error OnlyAddressOrOwner();
    /// @notice Emitted when trying to register and the contract is not ownable (EIP-173 "owner()")
    error NotOwnable();
    /// @notice Emitted when the registrant is already registered.
    error AlreadyRegistered();
    /// @notice Emitted when an address is filtered.
    error AddressFiltered(address filtered);
    /// @notice Emitted when a codeHash is filtered.
    error CodeHashFiltered(address account, bytes32 codeHash);

    mapping(address => address) private _registrations;

    bool public revertWithAddressFiltered;

    bool public revertWithCodeHashFiltered;
    /**
     * @notice Restricts method caller to the address or EIP-173 "owner()"
     */
    modifier onlyAddressOrOwner(address addr) {
        if (msg.sender != addr) {
            try Ownable(addr).owner() returns (address owner) {
                if (msg.sender != owner) {
                    revert OnlyAddressOrOwner();
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert NotOwnable();
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
        _;
    }

    function doRevert(bool _revertWithAddressFiltered, bool _revertWithCodeHashFiltered) external {
        revertWithAddressFiltered = _revertWithAddressFiltered;
        revertWithCodeHashFiltered = _revertWithCodeHashFiltered;
    }

    /**
     * @notice Registers an address with the registry. May be called by address itself or by EIP-173 owner.
     */
    function register(address registrant) external onlyAddressOrOwner(registrant) {
        if (_registrations[registrant] != address(0)) {
            revert AlreadyRegistered();
        }
        _registrations[registrant] = registrant;
        emit RegistrationUpdated(registrant, true);
    }

    /**
     * @notice Returns true if an address has registered
     */
    function isRegistered(address registrant) external view returns (bool) {
        return _registrations[registrant] != address(0);
    }

    /**
     * @notice Returns true if operator is not filtered for a given token, either by address or codeHash. Also returns
     *         true if supplied registrant address is not registered.
     *         Note that this method will *revert* if an operator or its codehash is filtered with an error that is
     *         more informational than a false boolean, so smart contracts that query this method for informational
     *         purposes will need to wrap in a try/catch or perform a low-level staticcall in order to handle the case
     *         that an operator is filtered.
     */
    function isOperatorAllowed(address registrant, address operator) external view returns (bool) {
        address registration = _registrations[registrant];
        if (registration != address(0)) {
            if (revertWithAddressFiltered) {
                revert AddressFiltered(operator);
            } else if (revertWithCodeHashFiltered) {
                bytes32 codeHash = operator.codehash;
                revert CodeHashFiltered(operator, codeHash);
            }
        }
        return true;
    }

    /**
     * @dev Convenience method to compute the code hash of an arbitrary contract
     */
    function codeHashOf(address a) external view returns (bytes32) {
        return a.codehash;
    }
}