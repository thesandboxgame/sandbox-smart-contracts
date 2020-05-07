pragma solidity 0.6.5;

import "../Interfaces/ERC20Extended.sol";


interface CatalystToken is ERC20Extended {
    function getValue(
        uint256 gemId,
        uint256 slotIndex,
        uint64 blockNumber
    ) external view returns (uint32);

    function getMintData()
        external
        view
        returns (
            uint8 rarity,
            uint16 maxGems,
            uint64 quantity
        );
}
