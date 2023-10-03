// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {LibRoyalties2981} from "../royalties/LibRoyalties2981.sol";
import {Royalties2981TestImpl} from "./Royalties2981TestImpl.sol";
import {AbstractRoyalties, LibPart} from "./AbstractRoyalties.sol";

contract TestERC721WithRoyaltyV2981 is
    Initializable,
    Royalties2981TestImpl,
    AbstractRoyalties,
    ERC721Upgradeable,
    OwnableUpgradeable
{
    function initialize() public initializer {
        __Ownable_init();
    }

    function mint(address to, uint256 tokenId, LibPart.Part[] memory _fees) external {
        _mint(to, tokenId);
        _saveRoyalties(tokenId, _fees);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721Upgradeable, Royalties2981TestImpl) returns (bool) {
        return
            interfaceId == LibRoyalties2981._INTERFACE_ID_ROYALTIES ||
            ERC721Upgradeable.supportsInterface(interfaceId) ||
            Royalties2981TestImpl.supportsInterface(interfaceId);
    }

    // solhint-disable-next-line no-empty-blocks
    function _onRoyaltiesSet(uint256 _id, LibPart.Part[] memory _fees) internal override {}
}