pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./CatalystValue.sol";


contract CatalystDataBase is CatalystValue {
    event CatalystConfiguration(uint256 indexed id, uint16 minQuantity, uint16 maxQuantity, uint256 sandMintingFee, uint256 sandUpdateFee);

    function _setMintData(uint256 id, MintData memory data) internal {
        _data[id] = data;
        _emitConfiguration(id, data.minQuantity, data.maxQuantity, data.sandMintingFee, data.sandUpdateFee);
    }

    function _setValueOverride(uint256 id, CatalystValue valueOverride) internal {
        _valueOverrides[id] = valueOverride;
    }

    function _setConfiguration(
        uint256 id,
        uint16 minQuantity,
        uint16 maxQuantity,
        uint256 sandMintingFee,
        uint256 sandUpdateFee
    ) internal {
        _data[id].minQuantity = minQuantity;
        _data[id].maxQuantity = maxQuantity;
        _data[id].sandMintingFee = uint88(sandMintingFee);
        _data[id].sandUpdateFee = uint88(sandUpdateFee);
        _emitConfiguration(id, minQuantity, maxQuantity, sandMintingFee, sandUpdateFee);
    }

    function _emitConfiguration(
        uint256 id,
        uint16 minQuantity,
        uint16 maxQuantity,
        uint256 sandMintingFee,
        uint256 sandUpdateFee
    ) internal {
        emit CatalystConfiguration(id, minQuantity, maxQuantity, sandMintingFee, sandUpdateFee);
    }

    ///@dev compute a random value between min to 25.
    //. example: 1-25, 6-25, 11-25, 16-25
    function _computeValue(
        uint256 seed,
        uint32 gemId,
        bytes32 blockHash,
        uint256 slotIndex,
        uint32 min
    ) internal pure returns (uint32) {
        return min + uint16(uint256(keccak256(abi.encodePacked(gemId, seed, blockHash, slotIndex))) % (26 - min));
    }

    function _ensureMinimum(uint32[] memory values, uint32 numGems) internal pure {
        for (uint256 i = 0; i < values.length; i++) {
            if (values[i] < 1 + (numGems - 1) * 5) {
                values[i] = 1 + (numGems - 1) * 5;
            }
        }
    }

    function getValues(
        uint256 catalystId,
        uint256 seed,
        GemEvent[] calldata events,
        uint32 totalNumberOfGemTypes
    ) external override view returns (uint32[] memory values) {
        CatalystValue valueOverride = _valueOverrides[catalystId];
        if (address(valueOverride) != address(0)) {
            return valueOverride.getValues(catalystId, seed, events, totalNumberOfGemTypes);
        }
        values = new uint32[](totalNumberOfGemTypes);

        uint32 numGems;
        for (uint256 i = events.length; i > 0; i--) {
            numGems += uint32(events[i - 1].gemIds.length);
        }

        uint32 currentNumGems = numGems;
        for (uint256 i = events.length; i > 0; i--) {
            for (uint256 j = events[i - 1].gemIds.length; j > 0; j--) {
                uint256 slotIndex = currentNumGems - events[i - 1].gemIds.length + j - 1;
                if (values[events[i - 1].gemIds[j - 1]] == 0) {
                    values[events[i - 1].gemIds[j - 1]] = _computeValue(seed, events[i - 1].gemIds[j - 1], events[i - 1].blockHash, slotIndex, 1);
                } else {
                    values[events[i - 1].gemIds[j - 1]] += 25;
                }
            }
            _ensureMinimum(values, currentNumGems);
            currentNumGems -= uint32(events[i - 1].gemIds.length);
        }
    }

    // function getValues(
    //     uint256 catalystId,
    //     uint256 seed,
    //     uint32[] calldata gemIds,
    //     bytes32[] calldata blockHashes
    // ) external override view returns (uint32[] memory values) {
    //     require(gemIds.length == blockHashes.length, "INCONSISTENT_LENGTHS");
    //     CatalystValue valueOverride = _valueOverrides[catalystId];
    //     if (address(valueOverride) != address(0)) {
    //         return valueOverride.getValues(catalystId, seed, gemIds, blockHashes);
    //     }
    //     values = new uint32[](gemIds.length);
    //     if (gemIds.length == 0) {
    //         return values;
    //     }

    //     uint32 maxGemIds = 0;
    //     for (uint256 i = gemIds.length; i > 0; i--) {
    //         if (gemIds[i - 1] > maxGemIds) {
    //             maxGemIds = gemIds[i - 1];
    //         }
    //     }
    //     uint32[] memory numGemsPerGemIds = new uint32[](maxGemIds + 1);
    //     for (uint256 i = gemIds.length; i > 0; i--) {
    //         numGemsPerGemIds[gemIds[i]]++;
    //     }
    //     for (uint256 i = gemIds.length; i > 0; i--) {
    //         uint32 gemId = gemIds[i - 1];
    //         if (numGemsPerGemIds[gemId] == 1) {
    //             // unique gems:
    //             // the more gems a catalyst have, the higher the floor start, 1 gem: 1, 2 gems: 6, 3 gems: 11, 4 gems: 16
    //             values[i - 1] = _computeValue(seed, gemId, blockHashes[i - 1], i, 1 + ((uint32(gemIds.length) - 1) * 5));
    //         } else {
    //             // multiple of the same gems
    //             if (numGemsPerGemIds[gemId] == 0) {
    //                 // last one is already counted, so 25 for others
    //                 values[i - 1] = 25; // 25 ensure multiple of the same gem will add up. so 2 Power gem will at least have a value of 26 (always more than a single gem which can only be between 1 and 25 by itself)
    //             } else {
    //                 numGemsPerGemIds[gemId] = 0; // record last gem
    //                 values[i - 1] = _computeValue(seed, gemId, blockHashes[i - 1], i, 1);
    //             }
    //         }
    //     }
    // }

    function getMintData(uint256 catalystId)
        external
        view
        returns (
            uint16 maxGems,
            uint16 minQuantity,
            uint16 maxQuantity,
            uint256 sandMintingFee,
            uint256 sandUpdateFee
        )
    {
        maxGems = _data[catalystId].maxGems;
        minQuantity = _data[catalystId].minQuantity;
        maxQuantity = _data[catalystId].maxQuantity;
        sandMintingFee = _data[catalystId].sandMintingFee;
        sandUpdateFee = _data[catalystId].sandUpdateFee;
    }

    struct MintData {
        uint88 sandMintingFee;
        uint88 sandUpdateFee;
        uint16 minQuantity;
        uint16 maxQuantity;
        uint16 maxGems;
    }

    mapping(uint256 => MintData) internal _data;
    mapping(uint256 => CatalystValue) internal _valueOverrides;
}
