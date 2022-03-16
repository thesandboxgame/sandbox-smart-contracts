//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {SafeMathWithRequire} from "../../common/Libraries/SafeMathWithRequire.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";

contract ContributionRules is Ownable {
    using Address for address;
    uint256 internal constant DECIMALS_9 = 1000000000;
    uint256 internal constant MIDPOINT_9 = 500000000;
    uint256 internal constant NFT_FACTOR_6 = 10000;
    uint256 internal constant NFT_CONSTANT_3 = 9000;
    uint256 internal constant ROOT3_FACTOR = 697;

    IERC721 public multiplierERC721;
    IERC1155 public multiplierERC1155;

    struct MultiplierERC721 {
        uint256[] ids;
        uint256[] multiplier;
    }

    struct MultiplierERC1155 {
        uint256[] ids;
        uint256[] multiplier;
    }

    mapping(IERC721 => MultiplierERC721) private _listERC721;
    mapping(IERC1155 => MultiplierERC1155) private _listERC1155;

    constructor(IERC721 _multiplierERC721, IERC1155 _multiplierERC1155) {
        multiplierERC721 = _multiplierERC721;
        multiplierERC1155 = _multiplierERC1155;
    }

    function computeMultiplier(address account, uint256 amountStaked) external view returns (uint256) {
        //TODO: compute the multiplier
        //TODO: calculate all the multipliers - update all the user contribution
    }

    function multiplierBalanceOfERC1155(uint256 amount) external {}

    function setERC1155MultiplierList(
        address contractERC1155,
        uint256[] memory ids,
        uint256[] memory multiplier
    ) external onlyOwner {
        require(contractERC1155 != address(0), "ContributionRules: invalid address");

        _listERC1155[IERC1155(contractERC1155)].ids = ids;
        _listERC1155[IERC1155(contractERC1155)].multiplier = multiplier;
    }

    function setERC721MultiplierList(
        address contractERC721,
        uint256[] memory ids,
        uint256[] memory multiplier
    ) external onlyOwner {
        require(contractERC721 != address(0), "ContributionRules: invalid address");

        _listERC721[IERC721(contractERC721)].ids = ids;
        _listERC721[IERC721(contractERC721)].multiplier = multiplier;
    }

    function multiplierBalanceOfERC721(address account, uint256 amountStaked) external view returns (uint256) {
        uint256 numNFT = multiplierERC721.balanceOf(account);
        if (numNFT == 0) {
            return amountStaked;
        }
        uint256 nftContrib =
            NFT_FACTOR_6 * (NFT_CONSTANT_3 + SafeMathWithRequire.cbrt3((((numNFT - 1) * ROOT3_FACTOR) + 1)));
        if (nftContrib > MIDPOINT_9) {
            nftContrib = MIDPOINT_9 + (nftContrib - MIDPOINT_9) / 10;
        }
        return amountStaked + ((amountStaked * nftContrib) / DECIMALS_9);
    }

    // right now, the only possible way to go through the list, is iterating the vector
    // we shouldn't have huge lists to avoid issues and high gas fees
    // TODO: think on other solutions to look for the ids/multipliers
    function _calcMultiplierListERC721(address account) internal pure returns (uint256) {
        // uint256 numNFT = multiplierERC721.balanceOf(account);
    }

    function _calcMultiplierListERC1155(address contractERC1155, address account) internal view returns (uint256) {
        uint256 multiplier = 0;
        IERC1155 refContract = IERC1155(contractERC1155);
        // uint256 numAssets = multiplierERC1155.balanceOf(account, id); //check for each item of the list and apply multiplier
        for (uint256 x = 0; x > _listERC1155[refContract].ids.length; x++) {
            uint256 bal = refContract.balanceOf(account, _listERC1155[refContract].ids[x]);

            //TODO: If the user has more, sum the multipliers? Apply the highest one?
            if (bal > 0) {
                multiplier = _listERC1155[refContract].multiplier[x];
            }
        }

        return multiplier;
    }
}
