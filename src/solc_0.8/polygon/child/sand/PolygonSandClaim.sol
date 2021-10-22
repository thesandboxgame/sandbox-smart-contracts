//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "./interfaces/IPolygonSand.sol";

contract PolygonSandClaim is Ownable {
    IPolygonSand internal immutable _polygonSand;
    IPolygonSand internal immutable _fakePolygonSand;
    uint256 public endOfClaimPeriod;

    event SandClaimed(address indexed user, uint256 amount);

    constructor(
        IPolygonSand polygonSand,
        IPolygonSand fakePolygonSand,
        uint256 claimDuration
    ) {
        _polygonSand = polygonSand;
        _fakePolygonSand = fakePolygonSand;
        endOfClaimPeriod = block.timestamp + claimDuration;
    }

    /**
     * @notice Swaps fake sand with the new polygonSand
     * @param amount the amount of tokens to be swapped
     */
    function claim(uint256 amount) external {
        require(block.timestamp <= endOfClaimPeriod, "Claim period is over");
        require(unclaimedSand() > amount, "Not enough sand for claim");
        bool success = _fakePolygonSand.transferFrom(msg.sender, address(this), amount);
        if (success) {
            _polygonSand.transfer(msg.sender, amount);
            emit SandClaimed(msg.sender, amount);
        }
    }

    /**
     * @notice We don't want minted sand to be locked here forever in case user does not claim it.
               So the owner can withdraw the remaining sand after a time period of two years.
     */
    function withdrawUnclaimed() external onlyOwner {
        require(block.timestamp > endOfClaimPeriod, "Claim Period is still going on");
        _polygonSand.transfer(msg.sender, unclaimedSand());
    }

    /**
     * @notice Update end of claim period
     * @param timestamp the time period to increase claim period by
     */
    function extendClaimPeriod(uint256 timestamp) external onlyOwner {
        require(timestamp > 0, "Extension time should be greater than 0");
        endOfClaimPeriod += timestamp;
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
    function claimedSand() external returns (uint256) {
        return _fakePolygonSand.balanceOf(address(this));
    }
}
