//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IPolygonSand {
    /// @notice update the ChildChainManager Proxy address
    /// @param newChildChainManagerProxy address of the new childChainManagerProxy
    function updateChildChainManager(address newChildChainManagerProxy) external;

    /// @notice called when tokens are deposited on root chain
    /// @param user user address for whom deposit is being done
    /// @param depositData abi encoded amount
    function deposit(address user, bytes calldata depositData) external;

    /// @notice called when user wants to withdraw tokens back to root chain
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
    /// @param amount amount to withdraw
    function withdraw(uint256 amount) external;

    /// @notice Get the balance of `owner`.
    /// @param owner The address to query the balance of.
    /// @return The amount owned by `owner`.
    function balanceOf(address owner) external returns (uint256);

    /// @notice transfer tokens to a specific address.
    /// @param to destination address receiving the tokens.
    /// @param amount number of tokens to transfer.
    /// @return success whether the transfer succeeded.
    function transfer(address to, uint256 amount) external returns (bool success);

    /// @notice transfer tokens from one address to another.
    /// @param from address tokens will be sent from.
    /// @param to destination address receiving the tokens.
    /// @param amount number of tokens to transfer.
    /// @return success whether the transfer succeeded.
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool success);

    function setTrustedForwarder(address trustedForwarder) external;
}
