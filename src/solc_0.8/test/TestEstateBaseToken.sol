//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EstateBaseToken} from "../estate/EstateBaseToken.sol";
import {EstateTokenIdHelperLib} from "../estate/EstateTokenIdHelperLib.sol";
import {TileLib} from "../common/Libraries/TileLib.sol";
import {MapLib} from "../common/Libraries/MapLib.sol";

contract TestEstateBaseToken is EstateBaseToken {
    constructor(
        address trustedForwarder,
        address admin,
        address landToken,
        uint16 chainIndex,
        string memory name_,
        string memory symbol_
    ) {
        initialize(trustedForwarder, admin, landToken, chainIndex, name_, symbol_);
    }

    function initialize(
        address trustedForwarder,
        address admin,
        address landToken,
        uint16 chainIndex,
        string memory name_,
        string memory symbol_
    ) public initializer {
        __ERC2771Context_init_unchained(trustedForwarder);
        __ERC721_init_unchained(name_, symbol_);
        __EstateBaseERC721_init_unchained(admin);
        __EstateBaseToken_init_unchained(landToken, chainIndex);
    }

    function getCurrentEstateId(uint256 storageId) external view returns (uint256) {
        return _estate(storageId).id;
    }

    function getBaseUri() external view returns (string memory) {
        return _baseURI();
    }

    function incrementTokenVersion(uint256 estateId) external returns (uint256 newEstateId) {
        newEstateId = _incrementTokenVersion(estateId);
        return (newEstateId);
    }

    function incrementTokenId(uint256 estateId) external pure returns (uint256 newEstateId) {
        return EstateTokenIdHelperLib.incrementVersion(estateId);
    }

    function packId(
        uint128 subId,
        uint32 chainIndex,
        uint96 version
    ) external pure returns (uint256) {
        return EstateTokenIdHelperLib.packId(subId, chainIndex, version);
    }

    function unpackId(uint256 estateId)
        public
        pure
        returns (
            uint128 subId,
            uint32 chainIndex,
            uint96 version
        )
    {
        return EstateTokenIdHelperLib.unpackId(estateId);
    }

    function translateSquare(
        uint256 x,
        uint256 y,
        uint256 size
    ) external pure returns (MapLib.TranslateResult memory) {
        TileLib.Tile memory t;
        return MapLib.translate(TileLib.set(t, 0, 0, size), x, y);
    }
}
