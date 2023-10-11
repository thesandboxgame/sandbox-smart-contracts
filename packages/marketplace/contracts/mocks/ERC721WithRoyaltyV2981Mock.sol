// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Royalties2981ImplMock} from "./Royalties2981ImplMock.sol";
import {AbstractRoyaltiesMock} from "./AbstractRoyaltiesMock.sol";

contract ERC721WithRoyaltyV2981Mock is Initializable, Royalties2981ImplMock, AbstractRoyaltiesMock, ERC721Upgradeable {
    function initialize() public initializer {
        __Ownable_init();
    }

    function mint(address to, uint256 tokenId, Part[] memory _fees) external {
        _mint(to, tokenId);
        _saveRoyalties(tokenId, _fees);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721Upgradeable, Royalties2981ImplMock) returns (bool) {
        return
            interfaceId == IERC2981.royaltyInfo.selector ||
            ERC721Upgradeable.supportsInterface(interfaceId) ||
            Royalties2981ImplMock.supportsInterface(interfaceId);
    }

    // solhint-disable-next-line no-empty-blocks
    function _onRoyaltiesSet(uint256 _id, Part[] memory _fees) internal override {}
}
