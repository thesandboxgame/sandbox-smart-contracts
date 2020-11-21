//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "./CatalystToken.sol";
import "./AssetAttributesRegistry.sol";

contract PrimaryCatalyst is CatalystToken {
    uint256 internal constant MAX_NUM_GEMS = 15;
    uint256 internal constant MAX_NUM_GEM_TYPES = 256;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        uint8 maxGems,
        uint16 _catalystId
    ) CatalystToken(name, symbol, admin, maxGems, _catalystId) {}

    function getMaxGems() external view override returns (uint8) {
        return _maxGems;
    }

    function getAttributes(uint256 assetId, AssetAttributesRegistry.GemEvent[] calldata events)
        external
        pure
        override
        returns (uint32[] memory values)
    {
        values = new uint32[](MAX_NUM_GEM_TYPES);

        uint256 numGems;
        for (uint256 i = 0; i < events.length; i++) {
            numGems += events[i].gemIds.length;
        }
        require(numGems <= MAX_NUM_GEMS, "TOO_MANY_GEMS");

        uint32 minValue = (uint32(numGems) - 1) * 5 + 1;

        uint256 numGemsSoFar = 0;
        for (uint256 i = 0; i < events.length; i++) {
            numGemsSoFar += events[i].gemIds.length;
            for (uint256 j = 0; j < events[i].gemIds.length; j++) {
                uint256 gemId = events[i].gemIds[j];
                uint256 slotIndex = numGemsSoFar - events[i].gemIds.length + j;
                if (values[gemId] == 0) {
                    // first gem : value = roll between ((numGemsSoFar-1)*5+1) and 25
                    values[gemId] = _computeValue(
                        assetId,
                        gemId,
                        events[i].blockHash,
                        slotIndex,
                        (uint32(numGemsSoFar) - 1) * 5 + 1
                    );
                    // bump previous values:
                    if (values[gemId] < minValue) {
                        values[gemId] = minValue;
                    }
                } else {
                    // further gem, previous roll are overriden with 25 and new roll between 1 and 25
                    uint32 newRoll = _computeValue(assetId, gemId, events[i].blockHash, slotIndex, 1);
                    values[gemId] = (((values[gemId] - 1) / 25) + 1) * 25 + newRoll;
                }
            }
        }
    }

    ///@dev compute a random value between min to 25.
    //. example: 1-25, 6-25, 11-25, 16-25
    function _computeValue(
        uint256 assetId,
        uint256 gemId,
        bytes32 blockHash,
        uint256 slotIndex,
        uint32 min
    ) internal pure returns (uint32) {
        return min + uint16(uint256(keccak256(abi.encodePacked(gemId, assetId, blockHash, slotIndex))) % (26 - min));
    }
}
