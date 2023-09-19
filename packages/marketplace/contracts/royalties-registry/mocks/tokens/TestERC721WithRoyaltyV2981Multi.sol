// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Royalties2981TestImpl} from "../../../royalties/mocks/Royalties2981TestImpl.sol";
import {LibRoyalties2981} from "../../../royalties/LibRoyalties2981.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract TestERC721WithRoyaltyV2981Multi is
    Initializable,
    Royalties2981TestImpl,
    ERC721Upgradeable,
    OwnableUpgradeable
{
    uint256 internal constant BASIS_POINTS = 10000;

    bytes4 internal constant INTERFACE_ID_IROYALTYUGC = 0xa30b4db9;

    struct Recipient {
        address payable recipient;
        uint16 bps;
    }

    Recipient[] private _recipients;

    function initialize() public initializer {
        __Ownable_init();
        setRoyalties(5000);
    }

    function mint(address to, uint256 tokenId, Recipient[] memory _fees) external {
        _mint(to, tokenId);
        _setRecipients(_fees);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == LibRoyalties2981._INTERFACE_ID_ROYALTIES || interfaceId == INTERFACE_ID_IROYALTYUGC;
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
        require(totalBPS == BASIS_POINTS, "Total bps must be 10000");
    }

    function getRecipients() external view returns (Recipient[] memory) {
        return _recipients;
    }

    function getCreatorAddress(uint256) external view returns (address creator) {
        // creator = address(uint160(tokenId));
        // return creator;
        return owner();
    }
}
