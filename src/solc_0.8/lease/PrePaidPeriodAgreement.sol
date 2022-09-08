// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {ILeaseImpl} from "./ILeaseImpl.sol";
import {ILease} from "./ILease.sol";

// TODO: Check reentrancy issues when calling sandToken and leaseContract
contract PrePaidPeriodAgreement is ILeaseImpl {
    struct LeaseProposal {
        uint256 rentalPrice;
        uint256 rentalPeriod;
        // This is to avoid a front-running from the owner on the user when he accept (for example: changing rentalPeriod).
        uint256 nonce;
    }

    struct LeaseData {
        LeaseProposal leaseProposal;
        uint256 expiration;
        // TODO: If a user propose a cancellation and then sells the lease he can cheat the buyer.
        // TODO: If we generalize this mechanism maybe we can move it to Lease.sol an clean this value on beforeTransfer.
        uint256 cancellationPenalty;
    }

    event AgreementProposed(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 nonce,
        address user,
        address owner
    );
    event AgreementAccepted(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 nonce,
        uint256 oldExpiration,
        uint256 newExpiration
    );
    event AgreementRenewed(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 nonce,
        uint256 oldExpiration,
        uint256 newExpiration
    );
    event CancellationProposed(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 nonce,
        address user,
        address owner,
        uint256 expiration,
        uint256 cancelationPenalty
    );
    event CancellationAccepted(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 nonce,
        address user,
        address owner,
        uint256 expiration,
        uint256 cancelationPenalty
    );

    IERC20 public sandToken;
    ILease public leaseContract;
    mapping(uint256 => LeaseData) public leases;
    // owner balances
    mapping(address => uint256) internal balances;

    // TODO: We can use a factory call from the leaseContract so it is known value instead a constructor one.
    // TODO: The same for the sandToken we can configure it in
    // TODO: the leaseContract (it affects which contract must be approved, where we store the sand, etc)
    constructor(IERC20 sandToken_, ILease leaseContract_) {
        sandToken = sandToken_;
        leaseContract = leaseContract_;
    }

    /// @dev called by the owner to propose a lease.
    function propose(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod
    ) external {
        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.owner, "invalid user");
        uint256 nonce = leases[agreementId].leaseProposal.nonce + 1;
        leases[agreementId].leaseProposal = LeaseProposal({
            rentalPrice: rentalPrice,
            rentalPeriod: rentalPeriod,
            nonce: nonce
        });
        emit AgreementProposed(agreementId, rentalPrice, rentalPeriod, nonce, agreement.user, agreement.owner);
    }

    /// @dev called by user to accept a lease (and pay for it).
    function accept(uint256 agreementId, uint256 nonce) external {
        (LeaseData memory oldData, LeaseData storage newData) = _accept(agreementId, nonce);
        emit AgreementAccepted(
            agreementId,
            oldData.leaseProposal.rentalPrice,
            oldData.leaseProposal.rentalPeriod,
            oldData.leaseProposal.nonce,
            oldData.expiration,
            newData.expiration
        );
    }

    /// @dev called by user to renew a lease (and pay for it).
    function renew(uint256 agreementId, uint256 nonce) external {
        (LeaseData memory oldData, LeaseData storage newData) = _accept(agreementId, nonce);
        emit AgreementRenewed(
            agreementId,
            oldData.leaseProposal.rentalPrice,
            oldData.leaseProposal.rentalPeriod,
            oldData.leaseProposal.nonce,
            oldData.expiration,
            newData.expiration
        );
    }

    /// @dev called by user to give the owner an opportunity to cancel a lease.
    function proposeCancellation(uint256 agreementId, uint256 cancellationAmount) external {
        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.user, "invalid user");
        LeaseData storage data = leases[agreementId];
        data.cancellationPenalty = cancellationAmount;
        emit CancellationProposed(
            agreementId,
            data.leaseProposal.rentalPrice,
            data.leaseProposal.rentalPeriod,
            data.leaseProposal.nonce,
            agreement.user,
            agreement.owner,
            data.expiration,
            data.cancellationPenalty
        );
    }

    /// @dev called by the owner to cancel a lease (and pay the penalty).
    function acceptCancellation(uint256 agreementId) external {
        uint256 amount = leases[agreementId].cancellationPenalty;
        require(amount > 0, "not proposed");

        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
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
        LeaseData memory data = leases[agreementId];
        delete leases[agreementId];
        emit CancellationAccepted(
            agreementId,
            data.leaseProposal.rentalPrice,
            data.leaseProposal.rentalPeriod,
            data.leaseProposal.nonce,
            agreement.user,
            agreement.owner,
            data.expiration,
            data.cancellationPenalty
        );
    }

    /// @notice called by owner to claim his earnings
    function claim(uint256 amount) external {
        require(amount > 0, "invalid amount");
        require(balances[msg.sender] >= amount, "not enough");
        balances[msg.sender] -= amount;
        require(sandToken.transfer(msg.sender, amount), "transfer error");
        // emit?, we can user the sand token transfer event
    }

    function clean(uint256 agreementId) external override {
        require(msg.sender == address(leaseContract), "invalid caller");
        delete leases[agreementId];
    }

    function isLeased(uint256 agreementId) external view override returns (bool) {
        return leases[agreementId].expiration != 0 && leases[agreementId].expiration >= block.timestamp;
    }

    function getAgreement(uint256 agreementId) external view returns (LeaseData memory) {
        return leases[agreementId];
    }

    /// @notice return the balance of staked tokens for a user
    /// @param account the address of the account
    /// @return balance of staked tokens
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function _accept(uint256 agreementId, uint256 nonce)
        internal
        returns (LeaseData memory oldData, LeaseData storage newData)
    {
        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.user, "invalid user");

        oldData = leases[agreementId];
        require(oldData.leaseProposal.nonce == nonce, "nothing to accept");
        require(
            sandToken.transferFrom(agreement.user, address(this), oldData.leaseProposal.rentalPrice),
            "transfer error"
        );
        if (oldData.expiration == 0) {
            oldData.expiration = block.timestamp;
        }

        balances[agreement.owner] += oldData.leaseProposal.rentalPrice;
        newData = leases[agreementId];
        newData.expiration = oldData.expiration + oldData.leaseProposal.rentalPeriod;
        newData.leaseProposal = LeaseProposal({
            rentalPrice: 0,
            rentalPeriod: 0,
            nonce: oldData.leaseProposal.nonce + 1
        });
        return (oldData, newData);
    }
}
