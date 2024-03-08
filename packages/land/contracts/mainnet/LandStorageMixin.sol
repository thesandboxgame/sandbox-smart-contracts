// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.23;

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

    function _getAdmin() internal view virtual returns (address) {
        return _admin;
    }

    function _setAdmin(address a) internal virtual {
        _admin = a;
    }
}
