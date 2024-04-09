// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC721BaseToken} from "./ERC721BaseToken.sol";
import {ILandToken} from "../interfaces/ILandToken.sol";

/**
 * @title LandBaseToken
 * @author The Sandbox
 * @notice Implement LAND and quad functionalities on top of an ERC721 token
 * @dev This contract implements a quad tree structure to handle groups of ERC721 tokens at once
 */
abstract contract LandBaseTokenCommon is ILandToken, ERC721BaseToken {
    using AddressUpgradeable for address;
    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    /* solhint-disable const-name-snakecase */
    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;
    /* solhint-enable const-name-snakecase */

    event Minter(address indexed superOperator, bool enabled);

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    /// @dev TODO: review the definition (not in standard?) and interface declaration.
    /// @inheritdoc ERC721BaseToken
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual override(ILandToken, ERC721BaseToken) {
        _batchTransferFrom(from, to, ids, data, false);
    }

    function _isMinter(address who) internal view virtual returns (bool);

    function _setMinter(address who, bool enabled) internal virtual;
}
