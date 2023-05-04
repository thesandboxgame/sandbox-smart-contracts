//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../defi/interfaces/IContributionRules.sol";

contract ContributionRulesMock is IContributionRules {
    mapping(address => uint256) public contribution;

    function computeMultiplier(address account, uint256) external view override returns (uint256) {
        return contribution[account];
    }

    function setContribution(address account, uint256 contribution_) external {
        contribution[account] = contribution_;
    }
}
