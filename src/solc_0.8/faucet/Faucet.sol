// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/utils/Strings.sol";

contract Faucet is Ownable {
    IERC20 internal immutable _ierc20;
    uint256 internal _period;
    uint256 internal _amountLimit;

    mapping(address => uint256) public _lastTimestamps;

    constructor(
        IERC20 ierc20,
        uint256 period,
        uint256 amountLimit
    ) {
        _ierc20 = ierc20;
        _period = period;
        _amountLimit = amountLimit;
    }

    event FaucetPeriod(uint256 period);
    event FaucetLimit(uint256 amountLimit);
    event FaucetSent(address _receiver, uint256 _amountSent);
    event FaucetRetrieved(address receiver, uint256 _amountSent);

    /// @notice set the minimum time delta between 2 calls to send() for an address.
    /// @param period time delta between 2 calls to send() for an address.
    function setPeriod(uint256 period) public onlyOwner {
        _period = period;
        emit FaucetPeriod(period);
    }

    /// @notice returns the minimum time delta between 2 calls to Send for an address.
    function getPeriod() public view returns (uint256) {
        return _period;
    }

    /// @notice return the maximum IERC20 token amount for an address.
    function setLimit(uint256 amountLimit) public onlyOwner {
        _amountLimit = amountLimit;
        emit FaucetLimit(amountLimit);
    }

    /// @notice return the maximum IERC20 token amount for an address.
    function getLimit() public view returns (uint256) {
        return _amountLimit;
    }

    /// @notice return the current IERC20 token balance for the contract.
    function balance() public view returns (uint256) {
        return _ierc20.balanceOf(address(this));
    }

    /// @notice retrieve all IERC20 token from contract to an address.
    /// @param receiver The address that will receive all IERC20 tokens.
    function retrieve(address receiver) public onlyOwner {
        uint256 accountBalance = balance();
        _ierc20.transferFrom(address(this), receiver, accountBalance);

        emit FaucetRetrieved(receiver, accountBalance);
    }

    /// @notice send amount of IERC20 to a receiver.
    /// @param amount The value of the IERC20 token that the receiver will received.
    function send(uint256 amount) public {
        require(
            amount <= _amountLimit,
            string(abi.encodePacked("Demand must not exceed ", Strings.toString(_amountLimit)))
        );

        uint256 accountBalance = balance();

        require(
            accountBalance > 0,
            string(abi.encodePacked("Insufficient balance on Faucet account: ", Strings.toString(accountBalance)))
        );
        require(
            _lastTimestamps[msg.sender] + _period < block.timestamp,
            string(abi.encodePacked("After each call you must wait ", Strings.toString(_period), " seconds."))
        );
        _lastTimestamps[msg.sender] = block.timestamp;

        if (accountBalance < amount) {
            amount = accountBalance;
        }
        _ierc20.transferFrom(address(this), msg.sender, amount);

        emit FaucetSent(msg.sender, amount);
    }
}
