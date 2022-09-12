// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import {ILeaseImpl} from "./ILeaseImpl.sol";
import {ILease} from "./ILease.sol";

// TODO: Check reentrancy issues when calling sandToken and leaseContract
contract PrePaidPeriodAgreement is ILeaseImpl {
    // TODO: This struct can be packed if we want: prices in 192 bits timestamps in 64
    struct LeaseData {
        // 0 == no proposal, >0 proposal price + 1, we support proposing a free rental
        uint256 rentalPrice;
        uint256 rentalPeriod;
        // TODO: If a user propose a cancellation and then sells the lease he can cheat the buyer.
        // TODO: If we generalize this mechanism maybe we can move it to Lease.sol an clean this value on beforeTransfer.
        // 0 == no proposal, >0 proposal price + 1, we support proposing a free cancelation
        uint256 cancellationPenalty;
        uint256 expiration;
    }

    event AgreementProposed(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        address user,
        address owner
    );
    event AgreementAccepted(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 oldExpiration,
        uint256 newExpiration
    );
    event AgreementRenewed(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod,
        uint256 oldExpiration,
        uint256 newExpiration
    );
    event CancellationProposed(
        uint256 agreementId,
        address user,
        address owner,
        uint256 expiration,
        uint256 cancelationPenalty
    );
    event CancellationAccepted(uint256 agreementId, address user, address owner, uint256 cancelationPenalty);

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

        leases[agreementId].rentalPrice = rentalPrice + 1;
        leases[agreementId].rentalPeriod = rentalPeriod;
        emit AgreementProposed(agreementId, rentalPrice, rentalPeriod, agreement.user, agreement.owner);
    }

    /// @dev called by user to accept a lease (and pay for it).
    function accept(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod
    ) external {
        (LeaseData memory oldData, LeaseData storage newData) = _accept(agreementId, rentalPrice, rentalPeriod);
        emit AgreementAccepted(agreementId, rentalPrice, rentalPeriod, oldData.expiration, newData.expiration);
    }

    /// @dev called by user to renew a lease (and pay for it).
    function renew(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod
    ) external {
        (LeaseData memory oldData, LeaseData storage newData) = _accept(agreementId, rentalPrice, rentalPeriod);
        emit AgreementRenewed(agreementId, rentalPrice, rentalPeriod, oldData.expiration, newData.expiration);
    }

    /// @dev called by user to give the owner an opportunity to cancel a lease.
    function proposeCancellation(uint256 agreementId, uint256 cancellationPenalty) external {
        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.user, "invalid user");
        LeaseData storage data = leases[agreementId];
        data.cancellationPenalty = cancellationPenalty + 1;
        emit CancellationProposed(agreementId, agreement.user, agreement.owner, data.expiration, cancellationPenalty);
    }

    /// @dev called by the owner to cancel a lease (and pay the penalty).
    function acceptCancellation(uint256 agreementId, uint256 cancellationPenalty) external {
        uint256 amount = leases[agreementId].cancellationPenalty;
        require(amount > 0, "not proposed");
        require(amount == cancellationPenalty + 1, "proposal changed");

        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        // TODO: For this kind of relationship maybe is a good idea that anybody can cancel (including the user) ?
        require(msg.sender == agreement.owner, "invalid user");
        if (balances[msg.sender] < cancellationPenalty) {
            require(
                sandToken.transferFrom(msg.sender, address(this), cancellationPenalty - balances[msg.sender]),
                "transfer error"
            );
            balances[msg.sender] = 0;
        } else {
            balances[msg.sender] -= cancellationPenalty;
        }
        balances[agreement.user] += cancellationPenalty;
        delete leases[agreementId];
        emit CancellationAccepted(agreementId, agreement.user, agreement.owner, cancellationPenalty);
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

    function _accept(
        uint256 agreementId,
        uint256 rentalPrice,
        uint256 rentalPeriod
    ) internal returns (LeaseData memory oldData, LeaseData storage newData) {
        ILease.Agreement memory agreement = leaseContract.getAgreement(agreementId);
        require(address(this) == address(agreement.impl), "invalid agreement");
        require(msg.sender == agreement.user, "invalid user");

        oldData = leases[agreementId];
        require(oldData.rentalPrice > 0, "not proposed");
        require(oldData.rentalPrice == rentalPrice + 1 && oldData.rentalPeriod == rentalPeriod, "agreement changed");
        require(sandToken.transferFrom(agreement.user, address(this), rentalPrice), "transfer error");
        if (oldData.expiration == 0) {
            oldData.expiration = block.timestamp;
        }

        balances[agreement.owner] += rentalPrice;
        newData = leases[agreementId];
        newData.expiration = oldData.expiration + rentalPeriod;
        newData.rentalPrice = 0;
        newData.rentalPeriod = 0;
        return (oldData, newData);
    }
}
