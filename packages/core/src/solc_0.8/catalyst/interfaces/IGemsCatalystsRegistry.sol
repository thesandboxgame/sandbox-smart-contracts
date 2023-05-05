//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../common/interfaces/IAssetAttributesRegistry.sol";
import "./IGem.sol";
import "./ICatalyst.sol";

interface IGemsCatalystsRegistry {
    function getAttributes(
        uint16 catalystId,
        uint256 assetId,
        IAssetAttributesRegistry.GemEvent[] calldata events
    ) external view returns (uint32[] memory values);

    function getMaxGems(uint16 catalystId) external view returns (uint8);

    function batchBurnGems(
        address from,
        uint16[] calldata gemIds,
        uint256[] calldata amounts
    ) external;

    function batchBurnCatalysts(
        address from,
        uint16[] calldata catalystIds,
        uint256[] calldata amounts
    ) external;

    function addGemsAndCatalysts(IGem[] calldata gems, ICatalyst[] calldata catalysts) external;

    function doesGemExist(uint16 gemId) external view returns (bool);

    function burnCatalyst(
        address from,
        uint16 catalystId,
        uint256 amount
    ) external;

    function burnGem(
        address from,
        uint16 gemId,
        uint256 amount
    ) external;

    function getCatalystDecimals(uint16 catalystId) external view returns (uint8);

    function getGemDecimals(uint16 gemId) external view returns (uint8);
}
