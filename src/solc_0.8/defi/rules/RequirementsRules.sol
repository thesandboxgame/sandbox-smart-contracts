//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";

contract RequirementsRules {
    uint128 public coeffERC721;
    uint128 public coeffERC1155;

    address public _requirementTokenERC721;

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
    mapping(address => RequireERC721) public _listERC721;
    mapping(address => RequireERC1155) public _listERC1155;

    modifier checkRequirement(address account, uint256 amount) {
        uint256 maxStakeNFT = _checkERC721List(account);
        require(amount > maxStakeNFT, "RequirementsRules: maxStake");

        uint256 maxStakeAsset = _checkERC1155List(account);
        require(amount > maxStakeAsset, "RequirementsRules: maxStake");

        _;
    }

    function setERC721RequirementToken(address requirementToken) external {
        require(requirementToken != address(0), "RequirementsRules: invalid address");
        _requirementTokenERC721 = requirementToken;
    }

    // TODO: check if really needed
    // function setERC1155RequirementToken(address token) external {}

    function setMaxRequirement(uint256 amount, uint256 maxStake) external {
        maxRequirements.amount = amount;
        maxRequirements.maxStake = maxStake;
    }

    // set ERC20 coefficient for the requirement list
    function setERC721CoeffRequirement(uint128 coeff) external {
        require(coeff > 0, "RequirementsRules: Coefficient > 0");
        coeffERC721 = coeff;
    }

    // set ERC20 coefficient for the requirement list
    function setERC1155CoeffRequirement(uint128 coeff) external {
        require(coeff > 0, "RequirementsRules: Coefficient > 0");
        coeffERC1155 = coeff;
    }

    // Depending on the logic, we can merge the functions below
    function setRequireERC721List(
        address contractERC721,
        uint256[] memory ids,
        uint256 amount
    ) external {
        require(contractERC721 != address(0), "RequirementsRules: invalid address");

        _listERC721[contractERC721].ids = ids;
        _listERC721[contractERC721].amount = amount;
    }

    function setRequireERC1155List(
        address contractERC1155,
        uint256[] memory ids,
        uint256 amount
    ) external {
        require(contractERC1155 != address(0), "RequirementsRules: invalid address");

        _listERC1155[contractERC1155].ids = ids;
        _listERC1155[contractERC1155].amount = amount;
    }

    // right now, the only possible way to go through the list, is iterating the vector
    // we shouldn't have huge list to avoid issues and high gas fees
    // TODO: think on other solutions to look for the ids
    function _checkERC721List(address account) internal pure returns (uint256) {
        uint256 prev = 200;
        return prev;
    }

    function _checkERC1155List(address account) internal pure returns (uint256) {
        uint256 prev = 200;
        return prev;
    }

    // Not needed
    // function requireAvatarList() external {}
}
