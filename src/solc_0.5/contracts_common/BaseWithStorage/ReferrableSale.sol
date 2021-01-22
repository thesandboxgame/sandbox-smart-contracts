pragma solidity ^0.5.2;

import "./Ownable.sol";

/**
 * @title ReferrableSale
 * @dev Implements the base elements for a sales referral system.
 * It is supposed to be inherited by a sales contract.
 * The referrals are expressed in percentage * 100, for example 1000 represents 10% and 555 represents 5.55%.
 */
contract ReferrableSale is Ownable {

    event DefaultReferralSet(
        uint256 percentage
    );

    event CustomReferralSet(
        address indexed referrer,
        uint256 percentage
    );

    uint256 public defaultReferralPercentage;
    mapping (address => uint256) public customReferralPercentages;

    function setDefaultReferral(uint256 _defaultReferralPercentage) public onlyOwner {
        require(_defaultReferralPercentage < 10000, "Referral must be less than 100 percent");
        require(_defaultReferralPercentage != defaultReferralPercentage, "New referral must be different from the previous");
        defaultReferralPercentage = _defaultReferralPercentage;
        emit DefaultReferralSet(_defaultReferralPercentage);
    }

    function setCustomReferral(address _referrer, uint256 _customReferralPercentage) public onlyOwner {
        require(_customReferralPercentage < 10000, "Referral must be less than 100 percent");
        require(_customReferralPercentage != customReferralPercentages[_referrer], "New referral must be different from the previous");
        customReferralPercentages[_referrer] = _customReferralPercentage;
        emit CustomReferralSet(_referrer, _customReferralPercentage);
    }
}
