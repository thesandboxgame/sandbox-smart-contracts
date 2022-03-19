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

    IERC721 public multiplierERC721Contract;
    IERC1155 public multiplierERC1155Contract;

    struct MultiplierERC721 {
        uint256[] ids;
        uint256[] multiplier;
    }

    struct MultiplierERC1155 {
        IERC1155 assetContract;
        uint256[] ids;
        uint256[] multiplier;
    }

    mapping(IERC721 => MultiplierERC721) private _listERC721;
    mapping(IERC1155 => MultiplierERC1155) private _listERC1155;

    constructor(IERC721 _multiplierERC721Contract, IERC1155 _multiplierERC1155Contract) {
        multiplierERC721Contract = _multiplierERC721Contract;
        multiplierERC1155Contract = _multiplierERC1155Contract;
    }

    //TODO: compute the multiplier - if a user has many multipliers, what is the case?
    // more than 1 asset in the list?
    function computeMultiplier(address account, uint256 amountStaked) external view returns (uint256) {
        uint256 landMultiplier = _multiplierBalanceOfERC721(account, amountStaked);
        uint256 assetMultiplier = _multiplierBalanceOfERC1155(account);

        return landMultiplier * assetMultiplier;
    }

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

    function _multiplierBalanceOfERC721(address account, uint256 amountStaked) internal view returns (uint256) {
        uint256 numNFT = multiplierERC721Contract.balanceOf(account);
        if (numNFT == 0) {
            return amountStaked;
        }
        uint256 nftMultiplier =
            NFT_FACTOR_6 * (NFT_CONSTANT_3 + SafeMathWithRequire.cbrt3((((numNFT - 1) * ROOT3_FACTOR) + 1)));
        if (nftMultiplier > MIDPOINT_9) {
            nftMultiplier = MIDPOINT_9 + (nftMultiplier - MIDPOINT_9) / 10;
        }
        // return amountStaked + ((amountStaked * nftMultiplier) / DECIMALS_9);
        return nftMultiplier;
    }

    // right now, the only possible way to go through the list, is iterating the vector
    // we shouldn't have huge lists to avoid issues and high gas fees
    // TODO: think on other solutions to look for the ids/multipliers
    // not possible to make it too generic - many different contracts - too many iterations
    function _multiplierBalanceOfERC1155(address account) internal view returns (uint256) {
        uint256 multiplier = 0;
        // uint256 numAssets = multiplierERC1155.balanceOf(account, id); //check for each item of the list and apply multiplier
        for (uint256 x = 0; x > _listERC1155[multiplierERC1155Contract].ids.length; x++) {
            uint256 bal = multiplierERC1155Contract.balanceOf(account, _listERC1155[multiplierERC1155Contract].ids[x]);

            //TODO: If the user has more, sum the multipliers? Apply the highest one?
            if (bal > 0) {
                multiplier = _listERC1155[multiplierERC1155Contract].multiplier[x];
            }
        }

        return multiplier / 100;
    }

    // function _calcMultiplierListERC721(address account) internal pure returns (uint256) {
    //     // uint256 numNFT = multiplierERC721.balanceOf(account);
    // }
}
