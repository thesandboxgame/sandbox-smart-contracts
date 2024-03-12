// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {PolygonLand} from "../PolygonLand.sol";

contract PolygonLandMock is PolygonLand {
    struct VarsStorage {
        uint256 _admin;
        uint256 _superOperators;
        uint256 _numNFTPerAddress;
        uint256 _owners;
        uint256 _operatorsForAll;
        uint256 _operators;
        uint256 _minters;
        uint256 _trustedForwarder;
        uint256 operatorFilterRegistry;
    }

    function getStorageStructure() external pure returns (VarsStorage memory ret) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let i := 0
            mstore(add(ret, i), _admin.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _superOperators.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _numNFTPerAddress.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _owners.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operatorsForAll.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _operators.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _minters.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), _trustedForwarder.slot)
            i := add(i, 0x20)
            mstore(add(ret, i), operatorFilterRegistry.slot)
            i := add(i, 0x20)
        }
    }
}
