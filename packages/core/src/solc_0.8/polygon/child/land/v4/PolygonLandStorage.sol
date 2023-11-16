// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;


import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";


library PolygonLandStorage {
    struct LandStorage {
        //0      _initialized
        bool _initialized;
        uint248 g1;
        //1      _initializing
        bool _initializing;
        uint248 g2;
        //2      __gap
        uint256[50] __gap;
        //52     _admin
        address _admin;
        uint96 g3;
        //53     _superOperators
        mapping(address => bool) _superOperators;
        //54     _numNFTPerAddress
        mapping(address => uint256) _numNFTPerAddress;
        //55     _owners
        mapping(uint256 => uint256) _owners;
        //56     _operatorsForAll
        mapping(address => mapping(address => bool)) _operatorsForAll;
        //57     _operators
        mapping(uint256 => address) _operators;
        //58     _minters
        mapping(address => bool) _minters;
        //59     __gap
        uint256[49] __gap2;
        //108    _trustedForwarder
        address _trustedForwarder;
        uint96 g4;
        //109    operatorFilterRegistry
        address operatorFilterRegistry;
        uint96 g5;
    }


    function _getStorage() internal pure returns (LandStorage storage $) {
        assembly {
            $.slot := 0
        }
    }
}

