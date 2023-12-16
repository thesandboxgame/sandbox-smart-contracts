// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

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
    struct Storage {
        uint8 _initialized; // not used anymore
        bool _initializing; // not used anymore
        uint256[50] __gap1;
        address _admin;
        mapping(address => bool) _superOperators;
        mapping(address => uint256) _numNFTPerAddress;
        mapping(uint256 => uint256) _owners;
        mapping(address => mapping(address => bool)) _operatorsForAll;
        mapping(uint256 => address) _operators;
        mapping(address => bool) _minters;
        uint256[49] __gap2;
        address _trustedForwarder;
        address operatorFilterRegistry;
    }
    // This moves everything just in case.
    uint256[500] private _initialGap;

    function _getPolygonLandStorage() internal pure returns (Storage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := 0
        }
    }
}
