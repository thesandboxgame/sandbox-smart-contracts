// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IRoyaltyUGC} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IRoyaltyUGC.sol";
import {IMultiRoyaltyRecipients} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IMultiRoyaltyRecipients.sol";
import {Royalties2981ImplMock} from "./Royalties2981ImplMock.sol";
import {TOTAL_BASIS_POINTS} from "../interfaces/IRoyaltiesProvider.sol";

contract ERC721WithRoyaltyV2981MultiMock is Initializable, Royalties2981ImplMock, ERC721Upgradeable {
    struct Recipient {
        address payable recipient;
        uint16 bps;
    }

    Recipient[] private _recipients;

    function initialize() external initializer {
        __Ownable_init();
        setRoyalties(5000);
    }

    function mint(address to, uint256 tokenId, Recipient[] memory _fees) external {
        _mint(to, tokenId);
        _setRecipients(_fees);
    }

    function getRecipients(uint256 /* tokenId */) external view returns (Recipient[] memory) {
        return _recipients;
    }

    function getCreatorAddress(uint256) external view returns (address creator) {
        // creator = address(uint160(tokenId));
        // return creator;
        return owner();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721Upgradeable, Royalties2981ImplMock) returns (bool) {
        return
            interfaceId == type(IMultiRoyaltyRecipients).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(IRoyaltyUGC).interfaceId ||
            ERC721Upgradeable.supportsInterface(interfaceId) ||
            Royalties2981ImplMock.supportsInterface(interfaceId);
    }

    function _setRecipients(Recipient[] memory recipients) internal {
        delete _recipients;
        if (recipients.length == 0) {
            return;
        }
        uint256 totalBPS;
        for (uint256 i; i < recipients.length; ++i) {
            totalBPS += recipients[i].bps;
            _recipients.push(recipients[i]);
        }
        require(totalBPS == TOTAL_BASIS_POINTS, "Total bps must be 10000");
    }
}
