// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {MapLib} from "../common/Libraries/MapLib.sol";

contract EstateBaseTokenStorage {
    uint256[50] private _preGap;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    uint256[50] private _posGap;

    struct Storage {
        uint64 nextId; // max uint64 = 18,446,744,073,709,551,615
        address landToken;
        // estate id => ipfs url hash
        mapping(uint256 => bytes32) metaData;
        // estate id => land tile set.
        mapping(uint256 => MapLib.Map) landTileSet;
    }

    function _s() internal pure returns (Storage storage ds) {
        bytes32 storagePosition = keccak256("EstateBaseToken.EstateBaseTokenStorage");
        assembly {
            ds.slot := storagePosition
        }
    }

    function _landTileSet(uint256 storageId) internal view returns (MapLib.Map storage) {
        return _s().landTileSet[storageId];
    }
}
