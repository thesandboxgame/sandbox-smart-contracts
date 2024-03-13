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
    mapping(address => bool) internal _superOperators;
    /// @notice Number of NFT an address own
    mapping(address => uint256) internal _numNFTPerAddress;
    /**
     * @dev mapping to store owner of lands and quads.
     * For 1x1 lands it also the 255 bit is 1 if that land has operator approved and is 0 if no operator is approved.
     * For burned 1x1 Land 160 bit is set to 1.
     */
    mapping(uint256 => uint256) internal _owners;
    /// @notice Operators for each owner address for all tokens
    mapping(address => mapping(address => bool)) public _operatorsForAll;
    /// @notice Operator for each token id
    mapping(uint256 => address) public _operators;

    mapping(address => bool) internal _minters;
    uint256[49] private __gap;
    address internal _trustedForwarder;

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

    function _setOperator(uint256 id, address val) internal virtual {
        _operators[id] = val;
    }

    function _isMinter(address who) internal view virtual returns (bool) {
        return _minters[who];
    }

    function _setMinter(address who, bool enabled) internal virtual {
        _minters[who] = enabled;
    }

    function _getTrustedForwarder() internal view virtual returns (address) {
        return _trustedForwarder;
    }

    function _setTrustedForwarder(address val) internal virtual {
        _trustedForwarder = val;
    }
}
