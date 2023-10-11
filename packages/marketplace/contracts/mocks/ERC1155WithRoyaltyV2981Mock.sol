// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {LibRoyalties2981} from "../royalties/LibRoyalties2981.sol";
import {AbstractRoyaltiesMock, LibPart} from "./AbstractRoyaltiesMock.sol";
import {Royalties2981ImplMock} from "./Royalties2981ImplMock.sol";

/// @title ERC1155WithRoyaltyV2981Mock contract
/// @dev contract that supports INTERFACE_ID_GET_RECIPIENTS but do not implements getRecipients function.
contract ERC1155WithRoyaltyV2981Mock is
    Initializable,
    Royalties2981ImplMock,
    AbstractRoyaltiesMock,
    ERC1155Upgradeable,
    OwnableUpgradeable
{
    uint256 internal constant BASIS_POINTS = 10000;

    bytes4 internal constant INTERFACE_ID_GET_RECIPIENTS = 0xfd90e897;

    function initialize() public initializer {
        __Ownable_init();
    }

    function mint(address to, uint256 tokenId, uint256 amount, LibPart.Part[] memory _fees) external {
        _mint(to, tokenId, amount, "");
        _saveRoyalties(tokenId, _fees);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155Upgradeable, Royalties2981ImplMock) returns (bool) {
        return
            interfaceId == LibRoyalties2981._INTERFACE_ID_ROYALTIES ||
            interfaceId == INTERFACE_ID_GET_RECIPIENTS ||
            ERC1155Upgradeable.supportsInterface(interfaceId) ||
            Royalties2981ImplMock.supportsInterface(interfaceId);
    }

    // solhint-disable-next-line no-empty-blocks
    function _onRoyaltiesSet(uint256 _id, LibPart.Part[] memory _fees) internal override {}
}
