//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {SafeMathWithRequire} from "../../common/Libraries/SafeMathWithRequire.sol";
import {IContributionCalculator} from "../interfaces/IContributionCalculator.sol";

contract LandOwnersAloneContributionCalculator is IContributionCalculator, Ownable {
    using Address for address;

    IERC721 public multiplierNFToken;

    constructor(IERC721 multiplierNFToken_) {
        multiplierNFToken = multiplierNFToken_;
    }

    function multiplierOf(address account) external view virtual returns (uint256) {
        return multiplierNFToken.balanceOf(account);
    }

    function computeContribution(address account, uint256 amountStaked) external view override returns (uint256) {
        uint256 numLands = multiplierNFToken.balanceOf(account);
        if (numLands > 0) {
            return amountStaked;
        }
        return 0;
    }

    function setNFTMultiplierToken(address newNFTMultiplierToken) external onlyOwner {
        require(newNFTMultiplierToken.isContract(), "LandOwnersAloneContributionCalc: Bad NFTMultiplierToken address");
        multiplierNFToken = IERC721(newNFTMultiplierToken);
    }
}
