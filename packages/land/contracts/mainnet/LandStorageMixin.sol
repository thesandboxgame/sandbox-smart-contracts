// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.20;

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
    address private _admin;
    mapping(address => bool) private _superOperators;
    mapping(address => bool) private _metaTransactionContracts;
    mapping(address => uint256) private _numNFTPerAddress;
    mapping(uint256 => uint256) private _owners;
    mapping(address => mapping(address => bool)) private _operatorsForAll;
    mapping(uint256 => address) private _operators;
    bool private _initialized; // not used after the upgrade
    uint256[49] private __gap;
    mapping(address => bool) private _minters;
    address private operatorFilterRegistry;

    // This moves everything just in case.
    uint256[500] private _initialGap;

    function $superOperators() internal view virtual returns (mapping(address => bool) storage) {
        return _superOperators;
    }

    function $metaTransactionContracts() internal view virtual returns (mapping(address => bool) storage) {
        return _metaTransactionContracts;
    }

    function $numNFTPerAddress() internal view virtual returns (mapping(address => uint256) storage) {
        return _numNFTPerAddress;
    }

    function $owners() internal view virtual returns (mapping(uint256 => uint256) storage) {
        return _owners;
    }

    function $operators() internal view virtual returns (mapping(uint256 => address) storage) {
        return _operators;
    }

    function $operatorsForAll() internal view virtual returns (mapping(address => mapping(address => bool)) storage) {
        return _operatorsForAll;
    }

    function $getAdmin() internal view virtual returns (address) {
        return _admin;
    }

    function $setAdmin(address a) internal virtual {
        _admin = a;
    }

    function $getOperatorFilterRegistry() internal view virtual returns (address a) {
        return operatorFilterRegistry;
    }

    function $setOperatorFilterRegistry(address a) internal virtual {
        operatorFilterRegistry = a;
    }

    function $minters() internal view virtual returns (mapping(address => bool) storage) {
        return _minters;
    }
}
