//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "./WithAdmin.sol";

contract WithMetaTransaction is WithAdmin {
    uint8 internal constant METATX_SANDBOX = 1;
    uint8 internal constant METATX_2771 = 2;

    mapping(address => uint8) internal _metaTransactionContracts;

    /// @dev Emits when a meta transaction processor is enabled / disabled.
    /// @param metaTransactionProcessor The address being enabled / disabled.
    /// @param processorType The type of metaTransactionProcessor to set.
    event MetaTransactionProcessor(address metaTransactionProcessor, uint8 processorType);

    /// @dev Enable or disable the ability of metaTransactionProcessor.
    /// to perform meta-tx (metaTransactionProcessor rights).
    /// @param metaTransactionProcessor The address that will have metaTransactionProcessor rights
    /// granted / revoked.
    /// @param processorType The metaTransactionProcessor type to set.
    function setMetaTransactionProcessor(address metaTransactionProcessor, uint8 processorType) public {
        require(msg.sender == _admin, "ADMIN_ACCESS_DENIED");
        _setMetaTransactionProcessor(metaTransactionProcessor, processorType);
    }

    /// @dev See setMetaTransactionProcessor
    function _setMetaTransactionProcessor(address metaTransactionProcessor, uint8 processorType) internal {
        _metaTransactionContracts[metaTransactionProcessor] = processorType;
        emit MetaTransactionProcessor(metaTransactionProcessor, processorType);
    }

    /// @dev Check whether address `who` has been granted meta-transaction execution rights.
    /// @param who The address to query.
    /// @return The type of metatx processor (0 for none).
    function getMetaTransactionProcessorType(address who) external view returns (uint8) {
        return _metaTransactionContracts[who];
    }

    // --------------------------------------------------------------------------------
    // EIP-2771 Meta Transaction Recipient
    // --------------------------------------------------------------------------------

    /// @notice Check if forwarder is trusted.
    /// @param forwarder The address to query.
    /// @return whether or not forwarder is trusted.
    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return _metaTransactionContracts[forwarder] == METATX_2771;
    }

    /// @dev Decide which sender address to use for this call.
    /// If the call came through our trusted forwarder, return the original sender.
    /// Otherwise, return `msg.sender`.
    /// @return ret The sender of this call.

    function _msgSender() internal view virtual returns (address payable ret) {
        if (isTrustedForwarder(msg.sender)) {
            return _forceMsgSender();
        } else {
            return msg.sender;
        }
    }

    /// @dev Get the actual sender of call.
    /// if the call came through our trusted forwarder, return the original sender.
    /// otherwise, return `msg.sender`.
    /// should be used in the contract anywhere instead of msg.sender
    /// @return ret The sender of this call.
    function _forceMsgSender() internal view virtual returns (address payable ret) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            ret := shr(96, calldataload(sub(calldatasize(), 20)))
        }
    }

    /// @dev Test if a tx is a valid Sandbox or EIP-2771 metaTransaction.
    /// @param from The address passed as either "from" or "sender" to the func which called this one.
    /// @return Whether this is a valid metaTransaction.
    function _isValidMetaTx(address from) internal view returns (bool) {
        uint256 processorType = _metaTransactionContracts[msg.sender];
        if (msg.sender == from || processorType == 0) {
            return false;
        }
        if (processorType == METATX_2771) {
            if (from != _forceMsgSender()) {
                return false;
            } else {
                return true;
            }
        } else if (processorType == METATX_SANDBOX) {
            return true;
        } else {
            return false;
        }
    }
}
