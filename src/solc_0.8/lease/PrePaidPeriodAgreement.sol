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
        // TODO: If a user propose a cancellation and then sells the lease he can cheat the buyer.
        // TODO: If we generalize this mechanism maybe we can move it to Lease.sol an clean this value on beforeTransfer.
        uint256 cancellationPenalty;
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

    /// @dev called by user to renew a lease (and pay for it).
    function renew(uint256 agreementId) external override {
        // TODO: Automatic renewal can be perjudicial to the owner, maybe we need a propose and accept mechanism.
        _accept(agreementId);
        // emit
    }

    /// @dev called by user to give the owner an opportunity to cancel a lease.
    function proposeCancellation(uint256 agreementId, uint256 cancellationAmount) external {
        ILeaseImpl.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.user, "invalid user");
        leases[agreementId].cancellationPenalty = cancellationAmount;
        // emit
    }

    /// @dev called by the owner to cancel a lease (and pay the penalty).
    function acceptCancellation(uint256 agreementId) external {
        uint256 amount = leases[agreementId].cancellationPenalty;
        require(amount > 0, "not proposed");

        ILeaseImpl.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        // TODO: Maybe anybody can cancel?
        require(msg.sender == agreement.owner, "invalid user");
        if (balances[msg.sender] < amount) {
            require(sandToken.transferFrom(msg.sender, address(this), amount - balances[msg.sender]), "transfer error");
            balances[msg.sender] = 0;
        } else {
            balances[msg.sender] -= amount;
        }
        balances[agreement.user] += amount;
        leases[agreementId].expiration = 0;
        // emit
    }

    function clean(uint256 agreementId) external override {
        require(msg.sender == address(leaseContract), "invalid caller");
        delete leases[agreementId];
    }

    /// @notice called by owner to claim his earnings
    function claim(uint256 amount) external {
        require(amount > 0, "invalid amount");
        require(balances[msg.sender] >= amount, "not enough");
        balances[msg.sender] -= amount;
        require(sandToken.transfer(msg.sender, amount), "transfer error");
        // emit?
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
        require(msg.sender == agreement.user, "invalid user");
        require(sandToken.transferFrom(agreement.user, address(this), amountPerPeriod), "transfer error");
        leases[agreementId].expiration += period;
        balances[agreement.owner] += amountPerPeriod;
    }
}
