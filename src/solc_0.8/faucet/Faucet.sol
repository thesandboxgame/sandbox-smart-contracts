// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract Faucet is Ownable {
    IERC20 internal immutable _ierc20;
    uint256 internal _period;
    uint256 internal _amountLimit;

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
    function period() public returns (uint256) {
        return _period;
    }

    /// @notice return the maximum IERC20 token amount for an address.
    function setLimit(uint256 amountLimit) public onlyOwner {
        _amountLimit = amountLimit;
        emit FaucetLimit(amountLimit);
    }

    /// @notice return the maximum IERC20 token amount for an address.
    function limit() public returns (uint256) {
        return _amountLimit;
    }

    /// @notice return the current IERC20 token balance for the contract.
    function balance() public returns (uint256) {
        address contractAddress = address(this);
        return _ierc20.balanceOf(contractAddress);
    }

    /// @notice retrieve all IERC20 token from contract to an address.
    /// @param receiver The address that will receive all IERC20 tokens.
    function retrieve(address receiver) public onlyOwner {
        address contractAddress = address(this);
        uint256 balance = _ierc20.balanceOf(contractAddress);
        _ierc20.transferFrom(contractAddress, receiver, balance);

        emit FaucetRetrieved(receiver, balance);
    }

    /// @notice send amount of IERC20 to a receiver.
    /// @param amount The value of the IERC20 token that the receiver will received.
    function send(uint256 amount) public {
        address _receiver = msg.sender;
        uint256 amountSent = amount;
        require(amount <= _amountLimit, string(abi.encodePacked("Demand must not exceed ", uint2str(_amountLimit))));

        address contractAddress = address(this);
        uint256 balance = _ierc20.balanceOf(contractAddress);

        require(balance > 0, string(abi.encodePacked("Insufficient balance on Faucet account: ", uint2str(balance))));
        require(
            _lastTimestamps[_receiver] + _period < block.timestamp,
            string(abi.encodePacked("After each call you must wait ", uint2str(_period), " seconds."))
        );
        _lastTimestamps[_receiver] = block.timestamp;

        if (balance < amount) {
            amountSent = balance;
        }
        _ierc20.transferFrom(contractAddress, _receiver, amountSent);

        emit FaucetSent(_receiver, amountSent);
    }

    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
