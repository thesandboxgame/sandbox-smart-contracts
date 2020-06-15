pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;


contract CatalystDataBase {
    function getValue(
        uint256 catalystId,
        uint32 gemId,
        uint256 catalystAssetId,
        bytes32 blockHash,
        uint256 slotIndex
    ) external view returns (uint32) {
        uint16 minValue = _data[catalystId].minValue;
        uint16 maxValue = _data[catalystId].maxValue;

        return _computeValue(catalystAssetId, gemId, minValue, maxValue, blockHash, slotIndex);
    }

    function _computeValue(
        uint256 catalystAssetId,
        uint32 gemId,
        uint16 minValue,
        uint16 maxValue,
        bytes32 blockHash,
        uint256 slotIndex
    ) internal pure returns (uint32) {
        uint16 range = maxValue - minValue;
        return minValue + uint16(uint256(keccak256(abi.encodePacked(gemId, catalystAssetId, blockHash, slotIndex))) % range);
    }

    function getValues(
        uint256 catalystId,
        uint256 catalystAssetId,
        uint32[] calldata gemIds,
        bytes32[] calldata blockHashes
    ) external view returns (uint32[] memory values) {
        require(gemIds.length == blockHashes.length, "inconsisten length");
        uint16 minValue = _data[catalystId].minValue;
        uint16 maxValue = _data[catalystId].maxValue;
        values = new uint32[](gemIds.length);
        for (uint256 i = 0; i < gemIds.length; i++) {
            values[i] = _computeValue(catalystAssetId, gemIds[i], minValue, maxValue, blockHashes[i], i);
        }
    }

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getMintData(uint256 catalystId) external view returns (uint16 maxGems, uint16 minQuantity, uint16 maxQuantity, uint256 sandFee) {
        maxGems = _data[catalystId].maxGems;
        minQuantity = _data[catalystId].minQuantity;
        maxQuantity = _data[catalystId].maxQuantity;
        sandFee = _data[catalystId].sandFee;
    }

    struct CatalystData {
        uint168 sandFee;
        uint16 minQuantity;
        uint16 maxQuantity;
        uint16 minValue;
        uint16 maxValue;
        uint16 maxGems;
    }

    mapping(uint256 => CatalystData) _data;
}
