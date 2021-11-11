//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "./interfaces/IPolygonSand.sol";

contract PolygonSandClaim is Ownable, ReentrancyGuard {
    IPolygonSand internal immutable _polygonSand;
    IERC20 internal immutable _fakePolygonSand;

    event SandClaimed(address indexed user, uint256 amount);

    constructor(IPolygonSand polygonSand, IERC20 fakePolygonSand) {
        _polygonSand = polygonSand;
        _fakePolygonSand = fakePolygonSand;
    }

    /**
     * @notice Swaps fake sand with the new polygonSand
     * @param amount the amount of tokens to be swapped
     */
    function claim(uint256 amount) external nonReentrant {
        require(unclaimedSand() >= amount, "Not enough sand for claim");
        bool success = _fakePolygonSand.transferFrom(msg.sender, address(this), amount);
        if (success) {
            _polygonSand.transfer(msg.sender, amount);
            emit SandClaimed(msg.sender, amount);
        }
    }

    // Getters

    /**
     * @notice Getter for amount of sand which is still locked in this contract
     */
    function unclaimedSand() public returns (uint256) {
        return _polygonSand.balanceOf(address(this));
    }

    /**
     * @notice Getter for amount of fake Sand swapped
     */
    function claimedSand() external view returns (uint256) {
        return _fakePolygonSand.balanceOf(address(this));
    }
}
