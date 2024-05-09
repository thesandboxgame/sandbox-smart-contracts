// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import {LandBase} from "../common/LandBase.sol";

contract LandBaseMock is LandBase {
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

    function changeAdminWithoutPerms(address newAdmin) external {
        _changeAdmin(newAdmin);
    }

    /// @notice Burns token `id`.
    /// @param id The token which will be burnt.
    function burn(uint256 id) external {
        _burn(_msgSender(), id);
    }

    /// @notice Burn token `id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id The token which will be burnt.
    function burnFrom(address from, uint256 id) external {
        _burn(from, id);
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

    ///////////////// STORAGE MIXING: we use a different storage structure from L1 and L2 on purpose
    address internal _admin;
    mapping(address => bool) internal _superOperators;
    mapping(address => uint256) internal _numNFTPerAddress;
    mapping(uint256 => uint256) internal _owners;
    mapping(address => mapping(address => bool)) internal _operatorsForAll;
    mapping(uint256 => address) internal _operators;
    mapping(address => bool) internal _minters;
    IOperatorFilterRegistry internal _operatorFilterRegistry;

    /// @notice get the admin address
    /// @return the admin address
    function _readAdmin() internal view override returns (address) {
        return _admin;
    }

    /// @notice set the admin address
    /// @param admin the admin address
    function _writeAdmin(address admin) internal override {
        _admin = admin;
    }

    /// @notice check if an address is a super-operator
    /// @param superOperator the operator address to check
    /// @return true if an address is a super-operator
    function _isSuperOperator(address superOperator) internal view override returns (bool) {
        return _superOperators[superOperator];
    }

    /// @notice enable an address to be super-operator
    /// @param superOperator the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeSuperOperator(address superOperator, bool enabled) internal override {
        _superOperators[superOperator] = enabled;
    }

    /// @notice get the number of nft for an address
    /// @param owner address to check
    /// @return the number of nfts
    function _readNumNFTPerAddress(address owner) internal view override returns (uint256) {
        return _numNFTPerAddress[owner];
    }

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _writeNumNFTPerAddress(address owner, uint256 quantity) internal override {
        _numNFTPerAddress[owner] = quantity;
    }

    /// @notice get the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @return the owner data
    function _readOwnerData(uint256 tokenId) internal view override returns (uint256) {
        return _owners[tokenId];
    }

    /// @notice set the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @param data the owner data
    function _writeOwnerData(uint256 tokenId, uint256 data) internal override {
        _owners[tokenId] = data;
    }

    /// @notice check if an operator was enabled by a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @return true if the operator has access
    function _isOperatorForAll(address owner, address operator) internal view override returns (bool) {
        return _operatorsForAll[owner][operator];
    }

    /// @notice Let an operator to access to all the tokens of a owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @param enabled if true give access to the operator, else disable it
    function _writeOperatorForAll(address owner, address operator, bool enabled) internal override {
        _operatorsForAll[owner][operator] = enabled;
    }

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _readOperator(uint256 tokenId) internal view override returns (address) {
        return _operators[tokenId];
    }

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _writeOperator(uint256 tokenId, address operator) internal override {
        _operators[tokenId] = operator;
    }

    /// @notice checks if an address is enabled as minter
    /// @param minter the address to check
    /// @return true if the address is a minter
    function _isMinter(address minter) internal view override returns (bool) {
        return _minters[minter];
    }

    /// @notice set an address as minter
    /// @param minter the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeMinter(address minter, bool enabled) internal override {
        _minters[minter] = enabled;
    }

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _readOperatorFilterRegistry() internal view override returns (IOperatorFilterRegistry) {
        return _operatorFilterRegistry;
    }

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _writeOperatorFilterRegistry(IOperatorFilterRegistry registry) internal override {
        _operatorFilterRegistry = registry;
    }
}
