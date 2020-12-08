//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

interface IERC20Receiver {
    function receiveApproval(
        address _from,
        uint256 _value,
        address _tokenAddress,
        bytes calldata _data
    ) external;
}
