// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";

contract Faucet {
    IERC20 internal immutable _ierc20;
    uint256 internal immutable _period;
    uint256 internal immutable _amountLimit;

    mapping(address => uint256) public _lastTimestamps;

    constructor(
        IERC20 ierc20,
        uint256 period,
        uint256 amountLimit
    ) public {
        _ierc20 = ierc20;
        _period = period;
        _amountLimit = amountLimit;
    }

    event FSent(address _receiver, uint256 _amountSent);

    /// @notice send amount of IERC20 to a receiver.
    /// @param amount The value (allowance) of the ERC20 tokens that the nominated.
    /// spender will be allowed to spend.
    function send(uint256 amount) public {
        address _receiver = msg.sender;
        uint256 amountSent = amount;
        require(amount < _amountLimit, "Demand should not exceed limit");
        require(
            _lastTimestamps[_receiver] + _period < block.timestamp,
            "Demand not available now. You should wait after each Demand."
        );
        _lastTimestamps[_receiver] = block.timestamp;

        address contractAddress = address(this);
        if (_ierc20.balanceOf(contractAddress) < amount) {
            amountSent = _ierc20.balanceOf(contractAddress);
        }
        _ierc20.transferFrom(contractAddress, _receiver, amountSent);

        emit FSent(_receiver, amountSent);
    }
}
