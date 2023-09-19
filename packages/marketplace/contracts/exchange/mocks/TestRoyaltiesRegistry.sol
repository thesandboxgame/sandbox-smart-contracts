// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {IRoyaltiesProvider} from "../../interfaces/IRoyaltiesProvider.sol";
import {LibPart} from "../../lib-part/LibPart.sol";
import {LibRoyalties2981} from "../../royalties/LibRoyalties2981.sol";
import {IERC2981} from "../../royalties/IERC2981.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

contract TestRoyaltiesRegistry is IRoyaltiesProvider {
    struct RoyaltiesSet {
        bool initialized;
        LibPart.Part[] royalties;
    }

    mapping(bytes32 => RoyaltiesSet) public royaltiesByTokenAndTokenId;
    mapping(address => RoyaltiesSet) public royaltiesByToken;

    function setRoyaltiesByToken(address token, LibPart.Part[] memory royalties) external {
        uint256 sumRoyalties = 0;
        for (uint256 i = 0; i < royalties.length; ++i) {
            require(royalties[i].account != address(0x0), "RoyaltiesByToken recipient should be present");
            require(royalties[i].value != 0, "Fee value for RoyaltiesByToken should be > 0");
            royaltiesByToken[token].royalties.push(royalties[i]);
            sumRoyalties += royalties[i].value;
        }
        require(sumRoyalties < 10000, "Set by token royalties sum more, than 100%");
        royaltiesByToken[token].initialized = true;
    }

    function setRoyaltiesByTokenAndTokenId(address token, uint256 tokenId, LibPart.Part[] memory royalties) external {
        setRoyaltiesCacheByTokenAndTokenId(token, tokenId, royalties);
    }

    function getRoyalties(address token, uint256 tokenId) external view override returns (LibPart.Part[] memory) {
        RoyaltiesSet memory royaltiesSet = royaltiesByTokenAndTokenId[keccak256(abi.encode(token, tokenId))];
        if (royaltiesSet.initialized) {
            return royaltiesSet.royalties;
        }
        royaltiesSet = royaltiesByToken[token];
        if (royaltiesSet.initialized) {
            return royaltiesSet.royalties;
        } else if (IERC165Upgradeable(token).supportsInterface(LibRoyalties2981._INTERFACE_ID_ROYALTIES)) {
            IERC2981 v2981 = IERC2981(token);
            try v2981.royaltyInfo(tokenId, LibRoyalties2981._WEIGHT_VALUE) returns (
                address receiver,
                uint256 royaltyAmount
            ) {
                return LibRoyalties2981.calculateRoyalties(receiver, royaltyAmount);
                // solhint-disable-next-line no-empty-blocks
            } catch {}
        }
        return royaltiesSet.royalties;
    }

    function setRoyaltiesCacheByTokenAndTokenId(
        address token,
        uint256 tokenId,
        LibPart.Part[] memory royalties
    ) internal {
        uint256 sumRoyalties = 0;
        bytes32 key = keccak256(abi.encode(token, tokenId));
        for (uint256 i = 0; i < royalties.length; ++i) {
            require(royalties[i].account != address(0x0), "RoyaltiesByTokenAndTokenId recipient should be present");
            require(royalties[i].value != 0, "Fee value for RoyaltiesByTokenAndTokenId should be > 0");
            royaltiesByTokenAndTokenId[key].royalties.push(royalties[i]);
            sumRoyalties += royalties[i].value;
        }
        require(sumRoyalties < 10000, "Set by token and tokenId royalties sum more, than 100%");
        royaltiesByTokenAndTokenId[key].initialized = true;
    }

    uint256[46] private __gap;
}
