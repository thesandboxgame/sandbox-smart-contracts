//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Strings} from "@openzeppelin/contracts-0.8/utils/Strings.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {EstateBaseToken} from "../../../estate/EstateBaseToken.sol";
import {MapLib} from "../../../common/Libraries/MapLib.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";

// solhint-disable-next-line no-empty-blocks
contract EstateTokenV1 is EstateBaseToken, Initializable {
    using MapLib for MapLib.Map;

    function initV1(
        address trustedForwarder,
        address admin,
        address land,
        uint8 chainIndex
    ) public initializer {
        _unchained_initV1(trustedForwarder, admin, land, chainIndex);
    }

    /// @notice Return the URI of a specific token.
    /// @param estateId The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 estateId) external view override returns (string memory uri) {
        require(_ownerOf(estateId) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 storageId = _storageId(estateId);
        return
            string(
                abi.encodePacked(
                    "ipfs://bafybei",
                    Strings.toHexString(uint256(_s().metaData[storageId]), 32),
                    "/",
                    "estateTokenV1.json"
                )
            );
    }
}
