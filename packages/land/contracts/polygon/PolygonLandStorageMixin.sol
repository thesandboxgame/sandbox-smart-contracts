// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";

/// @title PolygonLandStorageMixin
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Storage structure of the Polygon implementation of Land contract
/// @dev According to hardhat-storage plugin run onto the latest deployed version (@core)
/// @dev |          contract           │      state_variable       │ storage_slot │ offset │                       type                       │ idx │                     artifact                      │ numberOfBytes │
/// @dev |         PolygonLand         │       _initialized        │      0       │   0    │                     t_uint8                      │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │       1       │
/// @dev |         PolygonLand         │       _initializing       │      0       │   1    │                      t_bool                      │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │       1       │
/// @dev |         PolygonLand         │           __gap           │      1       │   0    │           t_array(t_uint256)50_storage           │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │     1600      │
/// @dev |         PolygonLand         │          _admin           │      51      │   0    │                    t_address                     │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      20       │
/// @dev |         PolygonLand         │      _superOperators      │      52      │   0    │           t_mapping(t_address,t_bool)            │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
/// @dev |         PolygonLand         │     _numNFTPerAddress     │      53      │   0    │          t_mapping(t_address,t_uint256)          │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
/// @dev |         PolygonLand         │          _owners          │      54      │   0    │          t_mapping(t_uint256,t_uint256)          │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
/// @dev |         PolygonLand         │     _operatorsForAll      │      55      │   0    │ t_mapping(t_address,t_mapping(t_address,t_bool)) │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
/// @dev |         PolygonLand         │        _operators         │      56      │   0    │          t_mapping(t_uint256,t_address)          │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
/// @dev |         PolygonLand         │         _minters          │      57      │   0    │           t_mapping(t_address,t_bool)            │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
/// @dev |         PolygonLand         │           __gap           │      58      │   0    │           t_array(t_uint256)49_storage           │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │     1568      │
/// @dev |         PolygonLand         │     _trustedForwarder     │     107      │   0    │                    t_address                     │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      20       │
/// @dev |         PolygonLand         │  operatorFilterRegistry   │     108      │   0    │     t_contract(IOperatorFilterRegistry)3942      │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      20       │
contract PolygonLandStorageMixin {
    /// @dev Obsolete: This is the storage used by the OZ v4 Initializer, they are unused now.
    uint8 private _initialized; // unused
    bool private _initializing; // unused
    uint256[50] private ___gap; // unused

    /// @dev The admin of the contract
    address internal _admin;

    /// @dev super operators that can transfer tokens on behalf of all the users
    mapping(address => bool) internal _superOperators;

    /// @dev Number of NFT an address own
    mapping(address => uint256) internal _numNFTPerAddress;

    /// @dev mapping to store owner of lands and quads.
    /// @dev For 1x1 lands the 255 bit is a flag that land has operator approved.
    /// @dev For 1x1 lands the 160 bit is a flag that indicates if the token is burned.
    mapping(uint256 => uint256) internal _owners;

    /// @dev Operators by owner address for all tokens
    mapping(address => mapping(address => bool)) internal _operatorsForAll;

    /// @dev Operator by token id, the operator flag must be also true (see: _owners)
    mapping(uint256 => address) internal _operators;

    /// @dev Addresses authorized to mint tokens
    mapping(address => bool) internal _minters;

    uint256[49] private __gap;

    /// @dev meta transaction ERC2771 trusted forarder
    address internal _trustedForwarder;

    /// @dev OpenSea operator filter registry address
    IOperatorFilterRegistry internal _operatorFilterRegistry;

    /// @notice get the admin address
    /// @return the admin address
    function _readAdmin() internal view virtual returns (address) {
        return _admin;
    }

    /// @notice set the admin address
    /// @param admin the admin address
    function _writeAdmin(address admin) internal virtual {
        _admin = admin;
    }

    /// @notice check if an address is a super-operator
    /// @param superOperator the operator address to check
    /// @return true if an address is a super-operator
    function _isSuperOperator(address superOperator) internal view virtual returns (bool) {
        return _superOperators[superOperator];
    }

    /// @notice enable an address to be super-operator
    /// @param superOperator the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeSuperOperator(address superOperator, bool enabled) internal virtual {
        _superOperators[superOperator] = enabled;
    }

    /// @notice get the number of nft for an address
    /// @param owner address to check
    /// @return the number of nfts
    function _readNumNFTPerAddress(address owner) internal view virtual returns (uint256) {
        return _numNFTPerAddress[owner];
    }

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _writeNumNFTPerAddress(address owner, uint256 quantity) internal virtual {
        _numNFTPerAddress[owner] = quantity;
    }

    /// @notice get the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @return the owner data
    function _readOwnerData(uint256 tokenId) internal view virtual returns (uint256) {
        return _owners[tokenId];
    }

    /// @notice set the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @param data the owner data
    function _writeOwnerData(uint256 tokenId, uint256 data) internal virtual {
        _owners[tokenId] = data;
    }

    /// @notice check if an operator was enabled by a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @return true if the operator has access
    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool) {
        return _operatorsForAll[owner][operator];
    }

    /// @notice Let an operator to access to all the tokens of a owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @param enabled if true give access to the operator, else disable it
    function _writeOperatorForAll(address owner, address operator, bool enabled) internal virtual {
        _operatorsForAll[owner][operator] = enabled;
    }

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _readOperator(uint256 tokenId) internal view virtual returns (address) {
        return _operators[tokenId];
    }

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _writeOperator(uint256 tokenId, address operator) internal virtual {
        _operators[tokenId] = operator;
    }

    /// @notice checks if an address is enabled as minter
    /// @param minter the address to check
    /// @return true if the address is a minter
    function _isMinter(address minter) internal view virtual returns (bool) {
        return _minters[minter];
    }

    /// @notice set an address as minter
    /// @param minter the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeMinter(address minter, bool enabled) internal virtual {
        _minters[minter] = enabled;
    }

    /// @notice get the address of the ERC2771 trusted forwarder
    /// @return the address of the trusted forwarder
    function _readTrustedForwarder() internal view virtual returns (address) {
        return _trustedForwarder;
    }

    /// @notice set the address of the ERC2771 trusted forwarder
    /// @param trustedForwarder the address of the trusted forwarder
    function _writeTrustedForwarder(address trustedForwarder) internal virtual {
        _trustedForwarder = trustedForwarder;
    }

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _readOperatorFilterRegistry() internal view virtual returns (IOperatorFilterRegistry) {
        return _operatorFilterRegistry;
    }

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _writeOperatorFilterRegistry(IOperatorFilterRegistry registry) internal virtual {
        _operatorFilterRegistry = registry;
    }
}
