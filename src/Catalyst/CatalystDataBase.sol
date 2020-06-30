pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./CatalystValue.sol";


contract CatalystDataBase is CatalystValue {
    event CatalystConfiguration(uint256 indexed id, uint16 minQuantity, uint16 maxQuantity, uint256 sandMintingFee, uint256 sandUpdateFee);

    function _setMindData(uint256 id, MintData memory data) internal {
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

    function _computeValue(
        uint256 seed,
        uint32 gemId,
        bytes32 blockHash,
        uint256 slotIndex
    ) internal pure returns (uint32) {
        return 1 + uint16(uint256(keccak256(abi.encodePacked(gemId, seed, blockHash, slotIndex))) % 25);
    }

    function getValues(
        uint256 catalystId,
        uint256 seed,
        uint32[] calldata gemIds,
        bytes32[] calldata blockHashes
    ) external override view returns (uint32[] memory values) {
        require(gemIds.length == blockHashes.length, "inconsisten length");
        CatalystValue valueOverride = _valueOverrides[catalystId];
        if (address(valueOverride) != address(0)) {
            return valueOverride.getValues(catalystId, seed, gemIds, blockHashes);
        }
        values = new uint32[](gemIds.length);
        if (gemIds.length == 0) {
            return values;
        }

        uint32 maxGemIds = 0;
        for (uint256 i = gemIds.length; i > 0; i--) {
            if (gemIds[i - 1] > maxGemIds) {
                maxGemIds = gemIds[i - 1];
            }
        }
        uint32[] memory valuesPerGemIds = new uint32[](maxGemIds + 1);
        for (uint256 i = gemIds.length; i > 0; i--) {
            uint32 gemId = gemIds[i - 1];
            if (valuesPerGemIds[gemId] == 0) {
                uint32 randomValue = _computeValue(seed, gemId, blockHashes[i - 1], i);
                valuesPerGemIds[gemId] = randomValue;
                values[i - 1] = randomValue;
            } else {
                values[i - 1] = 25;
            }
        }
    }

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

    mapping(uint256 => MintData) _data;
    mapping(uint256 => CatalystValue) _valueOverrides;
}
