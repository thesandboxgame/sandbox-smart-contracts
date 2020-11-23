//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "./Gem.sol";
import "./CatalystToken.sol";
import "./AssetAttributesRegistry.sol";
import "../common/BaseWithStorage/WithAdmin.sol";
import "hardhat/console.sol";

/// @notice Contract managing the Gems and Catalysts
/// Each Gems and Catalys must be registered here.
/// Each new Gem get assigned a new id (starting at 1)
/// Each new Catalyst get assigned a new id (starting at 1)
contract GemsAndCatalysts is WithAdmin {
    Gem[] internal _gems;
    CatalystToken[] internal _catalysts;

    constructor(address admin) {
        _admin = admin;
    }

    function getAttributes(
        uint16 catalystId,
        uint256 assetId,
        AssetAttributesRegistry.GemEvent[] calldata events
    ) external view returns (uint32[] memory values) {
        CatalystToken catalyst = getCatalyst(catalystId);
        require(catalyst != CatalystToken(0), "CATALYST_DOES_NOT_EXIST");
        return catalyst.getAttributes(assetId, events);
    }

    function getMaxGems(uint16 catalystId) external view returns (uint8) {
        CatalystToken catalyst = getCatalyst(catalystId);
        require(catalyst != CatalystToken(0), "CATALYST_DOES_NOT_EXIST");
        return catalyst.getMaxGems();
    }

    function burnDifferentGems(address from, uint16[] calldata gemIds) external {
        uint16 last = gemIds[0];
        uint256 count = 1;
        for (uint256 i = 1; i < gemIds.length; i++) {
            if (last != gemIds[i]) {
                burnGem(from, last, count);
                count = 1;
                last = gemIds[i];
            }
            count++;
        }
        if (count > 0) {
            burnGem(from, last, count);
        }
    }

    function burnDifferentCatalysts(address from, uint16[] calldata catalystIds) external {
        uint16 last = catalystIds[0];
        uint256 count = 1;
        for (uint256 i = 1; i < catalystIds.length; i++) {
            if (last != catalystIds[i]) {
                burnCatalyst(from, last, count);
                count = 1;
                last = catalystIds[i];
            }
            count++;
        }
        if (count > 0) {
            burnCatalyst(from, last, count);
        }
    }

    function addGemsAndCatalysts(Gem[] calldata gems, CatalystToken[] calldata catalysts) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        for (uint256 i = 0; i < gems.length; i++) {
            Gem gem = gems[i];
            uint16 gemId = gem.gemId();
            require(gemId == _gems.length + 1, "GEM_ID_NOT_IN_ORDER");
            _gems.push(gem);
        }

        for (uint256 i = 0; i < catalysts.length; i++) {
            CatalystToken catalyst = catalysts[i];
            uint16 catalystId = catalyst.catalystId();
            require(catalystId == _catalysts.length + 1, "CATALYST_ID_NOT_IN_ORDER");
            _catalysts.push(catalyst);
        }
    }

    function isGemExists(uint16 gemId) external view returns (bool) {
        return getGem(gemId) != Gem(0);
    }

    function isCatalystExists(uint16 catalystId) external view returns (bool) {
        return getCatalyst(catalystId) != CatalystToken(0);
    }

    function burnCatalyst(
        address from,
        uint16 catalystId,
        uint256 amount
    ) public {
        CatalystToken catalyst = getCatalyst(catalystId);
        require(catalyst != CatalystToken(0), "CATALYST_DOES_NOT_EXIST");
        catalyst.burnFor(from, amount);
    }

    function burnGem(
        address from,
        uint16 gemId,
        uint256 amount
    ) public {
        Gem gem = getGem(gemId);
        require(gem != Gem(0), "GEM_DOES_NOT_EXIST");
        gem.burnFor(from, amount);
    }

    function getCatalyst(uint16 catalystId) internal view returns (CatalystToken) {
        if (catalystId > 0 && catalystId <= _catalysts.length) {
            return _catalysts[catalystId - 1];
        } else {
            return CatalystToken(0);
        }
    }

    function getGem(uint16 gemId) internal view returns (Gem) {
        if (gemId > 0 && gemId <= _gems.length) {
            return _gems[gemId - 1];
        } else {
            return Gem(0);
        }
    }
}
