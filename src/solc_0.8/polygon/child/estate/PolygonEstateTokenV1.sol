//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../Game/GameBaseToken.sol";
import "../../../common/Libraries/MapLib.sol";
import "../../../estate/EstateBaseToken.sol";

contract PolygonEstateTokenV1 is EstateBaseToken, Initializable {
    using MapLib for MapLib.Map;

    struct Games {
        MapLib.Map[] gameLand;
        mapping(uint256 => uint256) gameIdx;
    }

    mapping(uint256 => Games) private games;

    GameBaseToken public gameToken;

    function initV1(
        address trustedForwarder,
        address admin,
        ILandToken land,
        GameBaseToken _gameToken,
        uint8 chainIndex
    ) public initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
        gameToken = _gameToken;
    }


}
