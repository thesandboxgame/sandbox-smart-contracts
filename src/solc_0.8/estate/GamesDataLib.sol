//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "../common/Libraries/MapLib.sol";

library GamesDataLib {
    using MapLib for MapLib.Map;

    struct GameEntry {
        MapLib.Map map;
        uint256 gameId;
    }

    struct Games {
        GameEntry[] values;
        mapping(uint256 => uint256) indexes;
    }

    function contains(Games storage self, uint256 gameId) internal view returns (bool) {
        return (self.indexes[gameId] != 0);
    }

    function getMap(Games storage self, uint256 gameId) internal view returns (MapLib.Map storage map) {
        require(self.indexes[gameId] != 0, "invalid gameId");
        return self.values[self.indexes[gameId] - 1].map;
    }

    function createGame(Games storage self, uint256 gameId) internal returns (bool) {
        if (self.indexes[gameId] != 0) {
            // already exists
            return false;
        }
        self.values.push();
        self.values[self.values.length - 1].gameId = gameId;
        self.indexes[gameId] = self.values.length;
        return true;
    }

    function length(Games storage self) internal view returns (uint256) {
        return self.values.length;
    }

    function getGameIdAt(Games storage self, uint256 idx) internal view returns (uint256) {
        return self.values[idx].gameId;
    }
}
