//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ILazyVault} from "./interfaces/ILazyVault.sol";

contract LazyVault is ILazyVault, AccessControlUpgradeable {
    address public sand;
    uint256 public tsbSplit;
    address public tsbRecipient;

    // declare the value per tier
    uint256[] public tierValues; // [0, 100, 200, 300, 400, 500, 600];

    function initialize(
        uint256[] memory _tierValues,
        uint256 _tsbSplit,
        address _tsbRecipient,
        address _sand
    ) public initializer {
        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        tierValues = _tierValues;
        tsbSplit = _tsbSplit;
        tsbRecipient = _tsbRecipient;
        sand = _sand;
    }

    function distribute(uint8[] calldata tiers, uint256[] calldata amounts, address[] calldata creators) external {
        require(tiers.length == amounts.length, "Tiers and amounts length mismatch");
        require(tiers.length == creators.length, "Tiers and creators length mismatch");

        for (uint256 i = 0; i < tiers.length; i++) {
            uint256 sandToSplit = amounts[i] * tierValues[tiers[i]];
            uint256 tsbShare = (sandToSplit * tsbSplit) / 10000;
            uint256 creatorShare = sandToSplit - tsbShare;

            IERC20(sand).transfer(tsbRecipient, tsbShare);
            IERC20(sand).transfer(creators[i], creatorShare);

            emit Distributed(tiers[i], amounts[i], tierValues[tiers[i]], creators[i], creatorShare, tsbShare);
        }
    }

    function transferToNewVault(address _newVault) external {
        require(_newVault != address(0), "New vault is the zero address");
        require(_newVault != address(this), "New vault is the current vault");

        uint256 sandBalance = IERC20(sand).balanceOf(address(this));
        IERC20(sand).transfer(_newVault, sandBalance);
    }

    function changeTierValue(uint8 tier, uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tier < tierValues.length, "Tier out of bounds");
        tierValues[tier] = value;
    }
}
