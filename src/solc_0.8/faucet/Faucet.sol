// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "../common/Base/TheSandbox712.sol";

contract Faucet is TheSandbox712 {
    IERC20 internal immutable _ierc20;
    uint256 internal immutable _period;
    uint256 internal immutable _amountLimit;
    address internal immutable _owner;

    bytes32 public constant FAUCET_TYPEHASH =
        keccak256("Faucet(address owner,uint256 amount,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public _nonces;
    mapping(address => uint256) public _lastTimestamps;

    struct Request {
        address receiver;
        uint256 amount;
    }

    constructor(
        IERC20 ierc20,
        uint256 period,
        uint256 amountLimit
    ) public payable {
        _ierc20 = ierc20;
        _period = period;
        _amountLimit = amountLimit;
        _owner = msg.sender;
    }

    event FSent(address _receiver, uint256 _amountSent);
    event FApproved(address _approvedOwner, uint256 _approvedAmount);

    /// @notice receive the expenditure of IERC20 by a spender.
    /// @param approvedAmount The value (allowance) of the ERC20 tokens that the nominated.
    /// spender will be allowed to spend.
    /// @param deadline The deadline for granting permission to the spender.
    /// @param v The final 1 byte of signature.
    /// @param r The first 32 bytes of signature.
    /// @param s The second 32 bytes of signature.
    function approve(
        uint256 approvedAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable {
        require(_owner == msg.sender, "Only contract owner can approve transfer.");
        require(deadline >= block.timestamp, "PAST_DEADLINE");
        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    _DOMAIN_SEPARATOR,
                    keccak256(abi.encode(FAUCET_TYPEHASH, _owner, approvedAmount, _nonces[_owner]++, deadline))
                )
            );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == _owner, "INVALID_SIGNATURE");
        _ierc20.approve(_owner, approvedAmount);
        emit FApproved(_owner, approvedAmount);
    }

    /// @notice send amount of IERC20 to a receiver.
    /// @param amount The value (allowance) of the ERC20 tokens that the nominated.
    /// spender will be allowed to spend.
    /// @param _receiver The deadline for granting permission to the spender.
    function receive(address payable _receiver, uint256 amount) public payable {
        uint256 amountSent = amount;

        require(amount < _amountLimit, "Demand should not exceed limit");
        require(
            _lastTimestamps[_receiver] + _period < block.timestamp,
            "Demand not available now. You should wait after each Demand."
        );
        _lastTimestamps[_receiver] = block.timestamp;

        if (_ierc20.balanceOf(_owner) > amount) {
            _ierc20.transferFrom(_owner, _receiver, amountSent);
        } else {
            amountSent = _ierc20.balanceOf(_owner);
            _ierc20.transferFrom(_owner, _receiver, amountSent);
        }

        emit FSent(_receiver, amountSent);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    function nonces(address owner) external view returns (uint256) {
        return _nonces[owner];
    }
}
