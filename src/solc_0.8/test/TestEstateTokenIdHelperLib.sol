//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {EstateTokenIdHelperLib} from "../estate/EstateTokenIdHelperLib.sol";

contract TestEstateTokenIdHelperLib {
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
}
