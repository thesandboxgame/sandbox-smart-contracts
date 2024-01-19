// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

//│          contract           │      state_variable       │ storage_slot │ offset │                       type                       │ idx │                     artifact                      │ numberOfBytes │
//│         PolygonLand         │       _initialized        │      0       │   0    │                     t_uint8                      │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │       1       │
//│         PolygonLand         │       _initializing       │      0       │   1    │                      t_bool                      │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │       1       │
//│         PolygonLand         │           __gap           │      1       │   0    │           t_array(t_uint256)50_storage           │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │     1600      │
//│         PolygonLand         │          _admin           │      51      │   0    │                    t_address                     │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      20       │
//│         PolygonLand         │      _superOperators      │      52      │   0    │           t_mapping(t_address,t_bool)            │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
//│         PolygonLand         │     _numNFTPerAddress     │      53      │   0    │          t_mapping(t_address,t_uint256)          │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
//│         PolygonLand         │          _owners          │      54      │   0    │          t_mapping(t_uint256,t_uint256)          │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
//│         PolygonLand         │     _operatorsForAll      │      55      │   0    │ t_mapping(t_address,t_mapping(t_address,t_bool)) │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
//│         PolygonLand         │        _operators         │      56      │   0    │          t_mapping(t_uint256,t_address)          │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
//│         PolygonLand         │         _minters          │      57      │   0    │           t_mapping(t_address,t_bool)            │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      32       │
//│         PolygonLand         │           __gap           │      58      │   0    │           t_array(t_uint256)49_storage           │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │     1568      │
//│         PolygonLand         │     _trustedForwarder     │     107      │   0    │                    t_address                     │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      20       │
//│         PolygonLand         │  operatorFilterRegistry   │     108      │   0    │     t_contract(IOperatorFilterRegistry)3942      │  0  │ /build-info/3abb06944792151ded64cbcd19543bb1.json │      20       │

contract PolygonLandStorageMixin {
    uint8 private _initialized; // not used anymore
    bool private _initializing; // not used anymore
    uint256[50] private __gap1;
    address private _admin;
    mapping(address => bool) private _superOperators;
    mapping(address => uint256) private _numNFTPerAddress;
    mapping(uint256 => uint256) private _owners;
    mapping(address => mapping(address => bool)) private _operatorsForAll;
    mapping(uint256 => address) private _operators;
    mapping(address => bool) private _minters;
    uint256[49] private __gap2;
    address private _trustedForwarder;
    address private operatorFilterRegistry;
    // This moves everything just in case.
    uint256[500] private _initialGap;

    function $superOperators() internal view virtual returns (mapping(address => bool) storage) {
        return _superOperators;
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

    function $getTrustedForwarder() internal view virtual returns (address) {
        return _trustedForwarder;
    }

    function $setTrustedForwarder(address a) internal virtual {
        _trustedForwarder = a;
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
