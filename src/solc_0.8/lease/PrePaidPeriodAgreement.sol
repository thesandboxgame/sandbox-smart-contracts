// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {ILeaseImpl} from "./ILeaseImpl.sol";
import {Lease} from "./Lease.sol";

// TODO: Check reentrancy issues when calling sandToken and leaseContract
// TODO: leaseContract value is critical!!!.
contract PrePaidPeriodAgreement is ILeaseImpl {
    struct LeaseData {
        uint256 expiration;
    }

    IERC20 public sandToken;
    Lease public leaseContract;
    uint256 public amountPerPeriod;
    uint256 public period;
    mapping(uint256 => LeaseData) public leases;
    // owner balances
    mapping(address => uint256) internal balances;

    // TODO: We can use a factory call from the leaseContract so it is known value instead a constructor onez).
    // TODO: The same for the sandToken we can configure it in
    // TODO: the leaseContract (it affects which contract must be approved, where we store the sand, etc)
    constructor(
        IERC20 sandToken_,
        Lease leaseContract_,
        uint256 amountPerPeriod_,
        uint256 period_
    ) {
        sandToken = sandToken_;
        leaseContract = leaseContract_;
        amountPerPeriod = amountPerPeriod_;
        period = period_;
    }

    /// @dev called by user to accept a lease (and pay for it).
    function accept(uint256 agreementId) external override {
        _accept(agreementId);
        // emit
    }

    function renew(uint256 agreementId) external override {
        _accept(agreementId);
        // emit
    }

    function clean(uint256 agreementId) external override {
        require(msg.sender == address(leaseContract), "invalid caller");
        delete leases[agreementId];
    }

    /// @notice called by owner to claim his earnings
    function claim(uint256 agreementId, uint256 amount) external {
        require(amount > 0, "invalid amount");
        ILeaseImpl.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.owner, "invalid user");
        uint256 balance = balances[agreement.owner];
        require(balance >= amount, "not enough");
        balances[agreement.owner] = balance - amount;
        require(sandToken.transfer(agreement.owner, amount), "transfer error");
        // emit
    }

    function isLeased(uint256 agreementId) external view override returns (bool) {
        return leases[agreementId].expiration != 0 && leases[agreementId].expiration < block.timestamp;
    }

    /// @notice return the balance of staked tokens for a user
    /// @param account the address of the account
    /// @return balance of staked tokens
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function _accept(uint256 agreementId) internal {
        ILeaseImpl.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        address user = leaseContract.ownerOf(agreementId);
        require(msg.sender == user, "invalid user");
        require(sandToken.transferFrom(user, address(this), amountPerPeriod), "transfer error");
        leases[agreementId].expiration = leases[agreementId].expiration + period;
        balances[agreement.owner] = balances[agreement.owner] + amountPerPeriod;
    }
}
