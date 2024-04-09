// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";

// According to hardhat-storage plugin run onto the latest deployed version (@core)
//│          contract           │      state_variable       │ storage_slot │ offset │                       type                       │ idx │                     artifact                      │ numberOfBytes │
//│            Land             │          _admin           │      0       │   0    │                    t_address                     │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      20       │
//│            Land             │      _superOperators      │      1       │   0    │           t_mapping(t_address,t_bool)            │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │ _metaTransactionContracts │      2       │   0    │           t_mapping(t_address,t_bool)            │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │     _numNFTPerAddress     │      3       │   0    │          t_mapping(t_address,t_uint256)          │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │          _owners          │      4       │   0    │          t_mapping(t_uint256,t_uint256)          │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │     _operatorsForAll      │      5       │   0    │ t_mapping(t_address,t_mapping(t_address,t_bool)) │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │        _operators         │      6       │   0    │          t_mapping(t_uint256,t_address)          │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │       _initialized        │      7       │   0    │                      t_bool                      │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │       1       │
//│            Land             │           __gap           │      8       │   0    │           t_array(t_uint256)49_storage           │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │     1568      │
//│            Land             │         _minters          │      57      │   0    │           t_mapping(t_address,t_bool)            │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      32       │
//│            Land             │  operatorFilterRegistry   │      58      │   0    │     t_contract(IOperatorFilterRegistry)1931      │  1  │ /build-info/8962c877ac6c2963a6c119c5538d62f6.json │      20       │

contract LandStorageMixin {
    address internal _admin;
    mapping(address => bool) internal _superOperators;
    mapping(address => bool) internal _metaTransactionContracts; // removed from the code, obsolete.
    /// @notice Number of NFT an address own
    mapping(address => uint256) internal _numNFTPerAddress;
    /**
     * @dev mapping to store owner of lands and quads.
     * For 1x1 lands it also the 255 bit is 1 if that land has operator approved and is 0 if no operator is approved.
     * For burned 1x1 Land 160 bit is set to 1.
     */
    mapping(uint256 => uint256) internal _owners;
    /// @notice Operators for each owner address for all tokens
    mapping(address => mapping(address => bool)) internal _operatorsForAll;
    /// @notice Operator for each token id
    mapping(uint256 => address) internal _operators;

    bool internal _initialized; // obsolete
    uint256[49] private __gap;
    mapping(address => bool) internal _minters;
    IOperatorFilterRegistry internal _operatorFilterRegistry;

    function _getAdmin() internal view virtual returns (address) {
        return _admin;
    }

    function _setAdmin(address a) internal virtual {
        _admin = a;
    }

    function _isSuperOperator(address who) internal view virtual returns (bool) {
        return _superOperators[who];
    }

    function _setSuperOperator(address superOperator, bool enabled) internal virtual {
        _superOperators[superOperator] = enabled;
    }

    function _getNumNFTPerAddress(address who) internal view virtual returns (uint256) {
        return _numNFTPerAddress[who];
    }

    function _setNumNFTPerAddress(address who, uint256 val) internal virtual {
        _numNFTPerAddress[who] = val;
    }

    function _getOwnerData(uint256 id) internal view virtual returns (uint256) {
        return _owners[id];
    }

    function _setOwnerData(uint256 id, uint256 data) internal virtual {
        _owners[id] = data;
    }

    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool) {
        return _operatorsForAll[owner][operator];
    }

    function _setOperatorForAll(address owner, address operator, bool enabled) internal virtual {
        _operatorsForAll[owner][operator] = enabled;
    }

    function _getOperator(uint256 id) internal view virtual returns (address) {
        return _operators[id];
    }

    function _setOperator(uint256 id, address operator) internal virtual {
        _operators[id] = operator;
    }

    function _isMinter(address who) internal view virtual returns (bool) {
        return _minters[who];
    }

    function _setMinter(address who, bool enabled) internal virtual {
        _minters[who] = enabled;
    }

    function _getOperatorFilterRegistry() internal view virtual returns (IOperatorFilterRegistry) {
        return _operatorFilterRegistry;
    }

    function _setOperatorFilterRegistry(IOperatorFilterRegistry registry) internal virtual {
        _operatorFilterRegistry = registry;
    }
}
