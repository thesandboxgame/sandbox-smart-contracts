pragma solidity ^0.6.0;


interface ERC20Receiver {
    function receiveApproval(
        address _from,
        uint256 _value,
        address _tokenAddress,
        bytes calldata _data
    ) external;
}
