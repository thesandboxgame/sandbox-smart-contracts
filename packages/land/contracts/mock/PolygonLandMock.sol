// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {PolygonLand} from "../PolygonLand.sol";

contract PolygonLandMock is PolygonLand {
    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    function simulateUpgrade(address admin) external {
        InitializableStorage storage $;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := INITIALIZABLE_STORAGE
        }
        $._initialized = 0;
        $._initializing = false;
        _writeAdmin(admin);
    }

    struct VarsStorage {
        uint256 _admin;
        uint256 _superOperators;
        uint256 _numNFTPerAddress;
        uint256 _owners;
        uint256 _operatorsForAll;
        uint256 _operators;
        uint256 _minters;
        uint256 _trustedForwarder;
        uint256 _operatorFilterRegistry;
    }

    struct V5VarsStorage {
        bytes32 owner;
        bytes32 royaltiesStorage;
        bytes32 landMetadataRegistry;
    }
    /// @notice Burns token `id`.
    /// @param id The token which will be burnt.
    function burn(uint256 id) external virtual {
        _burn(_msgSender(), id);
    }

    /// @notice Burn token `id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id The token which will be burnt.
    function burnFrom(address from, uint256 id) external virtual {
        _burn(from, id);
    }

    function changeAdminWithoutPerms(address newAdmin) external {
        _changeAdmin(newAdmin);
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

    function getV5VarsStorageStructure() external pure returns (V5VarsStorage memory ret) {
        ret.owner = OWNER_STORAGE_LOCATION;
        ret.royaltiesStorage = ROYALTIES_STORAGE_LOCATION;
        ret.landMetadataRegistry = METADATA_REGISTRY_STORAGE_LOCATION;
    }

    function erc7201StorageSlot(string memory id) external pure returns (uint256) {
        bytes32 ret = keccak256(abi.encode(uint256(keccak256(abi.encodePacked(id))) - 1)) & ~bytes32(uint256(0xff));
        return uint256(ret);
    }

    function getStorageStructure() external pure returns (VarsStorage memory ret) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let i := 0
            mstore(add(ret, i), _admin.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _superOperators.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _numNFTPerAddress.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _owners.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operatorsForAll.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operators.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _minters.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _trustedForwarder.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operatorFilterRegistry.slot)
            i := add(i, 0x20)
        }
    }
}
