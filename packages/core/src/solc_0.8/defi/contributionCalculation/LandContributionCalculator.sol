//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {SafeMathWithRequire} from "../../common/Libraries/SafeMathWithRequire.sol";
import {IContributionCalculator} from "../interfaces/IContributionCalculator.sol";

contract LandContributionCalculator is IContributionCalculator, Ownable {
    using Address for address;

    uint256 internal constant DECIMALS_9 = 1000000000;
    uint256 internal constant MIDPOINT_9 = 500000000;
    uint256 internal constant NFT_FACTOR_6 = 10000;
    uint256 internal constant NFT_CONSTANT_3 = 9000;
    uint256 internal constant ROOT3_FACTOR = 697;

    IERC721 public multiplierNFToken;

    constructor(IERC721 multiplierNFToken_) {
        multiplierNFToken = multiplierNFToken_;
    }

    function multiplierOf(address account) external view virtual returns (uint256) {
        return multiplierNFToken.balanceOf(account);
    }

    function computeContribution(address account, uint256 amountStaked) external view override returns (uint256) {
        uint256 numLands = multiplierNFToken.balanceOf(account);
        return _contribution(amountStaked, numLands);
    }

    function contribution(uint256 amountStaked, uint256 numLands) external pure returns (uint256) {
        return _contribution(amountStaked, numLands);
    }

    function setNFTMultiplierToken(address newNFTMultiplierToken) external onlyOwner {
        require(newNFTMultiplierToken.isContract(), "LandContributionCalc: Bad NFTMultiplierToken address");
        multiplierNFToken = IERC721(newNFTMultiplierToken);
    }

    function _contribution(uint256 amountStaked, uint256 numLands) internal pure returns (uint256) {
        if (numLands == 0) {
            return amountStaked;
        }
        uint256 nftContrib =
            NFT_FACTOR_6 * (NFT_CONSTANT_3 + SafeMathWithRequire.cbrt3((((numLands - 1) * ROOT3_FACTOR) + 1)));
        if (nftContrib > MIDPOINT_9) {
            nftContrib = MIDPOINT_9 + (nftContrib - MIDPOINT_9) / 10;
        }
        return amountStaked + ((amountStaked * nftContrib) / DECIMALS_9);
    }
}
