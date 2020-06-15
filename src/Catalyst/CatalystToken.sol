pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;


interface CatalystToken {
    function getValue(
        uint256 catalystId,
        uint32 gemId,
        uint96 seed,
        bytes32 blockHash,
        uint256 slotIndex
    ) external view returns (uint32);

    function getMintData(uint256 catalystId)
        external
        view
        returns (
            uint8 rarity,
            uint16 maxGems,
            uint16 minQuantity,
            uint16 maxQuantity,
            uint256 sandFee
        );

    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external;

    function burnFrom(
        address from,
        uint256 id,
        uint256 amount
    ) external;
}
