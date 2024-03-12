// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.23;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

// According to hardhat-storage plugin run onto the latest deployed version (@core)
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

contract PolygonLandStorageMixin is ContextUpgradeable {
    address internal _admin;

    function _getAdmin() internal view virtual returns (address) {
        return _admin;
    }

    function _setAdmin(address a) internal virtual {
        _admin = a;
    }
}
