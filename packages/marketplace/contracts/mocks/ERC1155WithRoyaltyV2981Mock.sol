// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IMultiRoyaltyRecipients} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IMultiRoyaltyRecipients.sol";
import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";
import {AbstractRoyaltiesMock} from "./AbstractRoyaltiesMock.sol";
import {Royalties2981ImplMock} from "./Royalties2981ImplMock.sol";

/// @title ERC1155WithRoyaltyV2981Mock contract
/// @dev contract that supports IMultiRoyaltyRecipients but do not implements getRecipients function.
contract ERC1155WithRoyaltyV2981Mock is
    Initializable,
    Royalties2981ImplMock,
    AbstractRoyaltiesMock,
    ERC1155Upgradeable
{
    function mint(address to, uint256 tokenId, uint256 amount, IRoyaltiesProvider.Part[] memory _fees) external {
        _mint(to, tokenId, amount, "");
        _saveRoyalties(tokenId, _fees);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC1155Upgradeable, Royalties2981ImplMock) returns (bool) {
        return
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(IMultiRoyaltyRecipients).interfaceId ||
            ERC1155Upgradeable.supportsInterface(interfaceId) ||
            Royalties2981ImplMock.supportsInterface(interfaceId);
    }

    // solhint-disable-next-line no-empty-blocks
    function _onRoyaltiesSet(uint256 _id, IRoyaltiesProvider.Part[] memory _fees) internal override {}
}
