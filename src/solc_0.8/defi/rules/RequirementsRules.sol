//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";

contract RequirementsRules is Ownable {
    using Address for address;

    uint128 public coeffERC721;
    uint128 public coeffERC1155;

    IERC721 public _requirementTokenERC721;
    IERC1155 public _requirementTokenERC1155;

    struct RequireERC721 {
        uint256[] ids;
        uint256 amount;
    }

    struct RequireERC1155 {
        uint256[] ids;
        uint256 amount;
    }

    struct MaxRequirements {
        uint256 amount;
        uint256 maxStake;
    }

    MaxRequirements public maxRequirements;

    //consider using map(adress, map(id, amount))
    mapping(address => uint256) public _listERC721;
    mapping(address => RequireERC1155) public _listERC1155;

    modifier checkRequirement(address account, uint256 amount) {
        uint256 maxStakeNFT = _checkERC721List(account);
        require(amount > maxStakeNFT, "RequirementsRules: maxStake");

        uint256 maxStakeAsset = _checkERC1155List(account);
        require(amount > maxStakeAsset, "RequirementsRules: maxStake");

        _;
    }

    function setERC721RequirementToken(address requirementToken) external onlyOwner {
        require(requirementToken.isContract(), "RequirementsRules: Bad requirementToken address");
        _requirementTokenERC721 = IERC721(requirementToken);
    }

    // TODO: check if really needed
    function setERC1155RequirementToken(address requirementToken) external {
        require(requirementToken.isContract(), "RequirementsRules: Bad requirementToken address");
        _requirementTokenERC1155 = IERC1155(requirementToken);
    }

    function setMaxRequirement(uint256 amount, uint256 maxStake) external onlyOwner {
        maxRequirements.amount = amount;
        maxRequirements.maxStake = maxStake;
    }

    // set ERC20 coefficient for the requirement list
    function setERC721CoeffRequirement(uint128 coeff) external onlyOwner {
        require(coeff > 0, "RequirementsRules: Coefficient > 0");
        coeffERC721 = coeff;
    }

    // set ERC20 coefficient for the requirement list
    function setERC1155CoeffRequirement(uint128 coeff) external onlyOwner {
        require(coeff > 0, "RequirementsRules: Coefficient > 0");
        coeffERC1155 = coeff;
    }

    function setRequireERC721List(address contractERC721, uint256 amount) external onlyOwner {
        require(contractERC721 != address(0), "RequirementsRules: invalid address");

        _listERC721[contractERC721] = amount;
    }

    function setRequireERC1155List(
        address contractERC1155,
        uint256[] memory ids,
        uint256 amount
    ) external onlyOwner {
        require(contractERC1155 != address(0), "RequirementsRules: invalid address");

        _listERC1155[contractERC1155].ids = ids;
        _listERC1155[contractERC1155].amount = amount;
    }

    function _checkERC721List(address account) internal view returns (uint256) {
        return _requirementTokenERC721.balanceOf(account);
    }

    // right now, the only possible way to go through the list, is iterating the vector
    // we shouldn't have huge lists to avoid issues and high gas fees
    // TODO: think on other solutions to look for the ids
    function _checkERC1155List(address account) internal view returns (uint256) {
        uint256 totalBal = 0;
        for (uint256 x = 0; x > _listERC1155[address(_requirementTokenERC1155)].ids.length; x++) {
            uint256 bal =
                _requirementTokenERC1155.balanceOf(account, _listERC1155[address(_requirementTokenERC1155)].ids[x]);

            totalBal = totalBal + bal;
        }
        return totalBal;
    }
}
