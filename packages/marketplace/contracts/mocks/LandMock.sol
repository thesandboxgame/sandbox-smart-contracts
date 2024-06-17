/// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Land} from "./land/Land.sol";

contract LandMock is Land {
    struct VarsStorage {
        uint256 _admin;
        uint256 _superOperators;
        uint256 _metaTransactionContracts;
        uint256 _numNFTPerAddress;
        uint256 _owners;
        uint256 _operatorsForAll;
        uint256 _operators;
        uint256 _initialized; // not used after the upgrade
        uint256 _minters;
        uint256 operatorFilterRegistry;
    }

    /// @notice sets Approvals with operator filterer check in case to test the transfer.
    /// @param operator address of the operator to be approved
    /// @param approved bool value denoting approved (true) or not Approved(false)
    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function registerFilterer(address subscriptionOrRegistrantToCopy, bool subscribe) external {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    function getStorageStructure() external pure returns (VarsStorage memory ret) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let i := 0
            mstore(add(ret, i), _admin.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _superOperators.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _metaTransactionContracts.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _numNFTPerAddress.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _owners.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operatorsForAll.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operators.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _initialized.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _minters.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operatorFilterRegistry.slot)
            i := add(i, 0x20)
        }
    }

    /// @notice Burns token `id`.
    /// @param id token which will be burnt.
    function burn(uint256 id) external {
        _burn(_msgSender(), id);
    }

    /// @notice Burn token`id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id token which will be burnt.
    function burnFrom(address from, uint256 id) external {
        _burn(from, id);
    }
}
