// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/// @title interface for the WhiteList contract
/// @notice contains the signature for the contract function
interface IWhiteList {
    /// @notice if status == tsbOnly, then only tsbListedContracts [small mapping]
    /// @return tsbOnly
    function tsbOnly() external view returns (bool);

    /// @notice if status == partners, then tsbListedContracts and partnerContracts [manageable mapping]
    /// @return partners
    function partners() external view returns (bool);

    // @notice if status == open, then no whitelist [no mapping needed]. But then we need a removeListing function for contracts we subsequently
    /// @return open
    function open() external view returns (bool);

    /// @notice if status == erc20List, users can only pay white whitelisted ERC20 tokens
    /// @return erc20List
    function erc20List() external view returns (bool);
}
