// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {Lock} from "../src/Lock.sol";

contract LockTest is Test {
    Lock public lock;

    address fakeCaller = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address payable recipient =
        payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);

    error NotOwner(address owner, address caller);
    error NotUnlocked(uint256 unlockTime, uint256 blockTimestamp);
    error PastUnlockTime(uint256 unlockTime, uint256 blockTimestamp);

    event Withdrawal(uint256 amount, uint256 when);

    function setUp() public {
        vm.warp(block.timestamp + 365 days);
        lock = (new Lock){value: 1 ether}(block.timestamp + 360 days);
    }

    // Verify that the lock duration is initialized correctly
    function test_LockDuration() public {
        assertEq(lock.unlockTime(), block.timestamp + 360 days);
    }

    // Verify that the lock owner is initialized correctly
    function test_Owner() public {
        assertEq(lock.owner(), address(this));
    }

    // Verify that the lock balance is correct
    function test_Balance() public {
        assertEq(address(lock).balance, 1 ether);
    }

    // Verify that the lock contract cannot be deployed with a past unlock time
    function test_RevertWhen_LockDurationInThePast() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PastUnlockTime.selector,
                block.timestamp - 1,
                block.timestamp
            )
        );
        (new Lock){value: 1 ether}(block.timestamp - 1);
    }

    // Users should not be able to withdraw before the unlock time
    function test_RevertWhen_WithdrawBeforeUnlock() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                NotUnlocked.selector,
                lock.unlockTime(),
                block.timestamp
            )
        );
        lock.withdraw(recipient);
    }

    // Users should not be able to withdraw if they are not the owner
    function test_RevertWhen_WithdrawNotOwner() public {
        vm.expectRevert(
            abi.encodeWithSelector(NotOwner.selector, address(this), fakeCaller)
        );
        vm.warp(block.timestamp + 365 days);
        hoax(fakeCaller);
        lock.withdraw(recipient);
        assertEq(address(lock).balance, 1 ether);
    }

    // User should be able to withdraw after the unlock time
    function test_WithdrawAfterUnlock() public {
        assertEq(address(lock).balance, 1 ether);
        vm.warp(block.timestamp + 365 days);
        lock.withdraw(recipient);
        assertEq(address(lock).balance, 0);
    }

    // Verify that the lock contract emits the Withdrawal event
    function test_WithdrawEventEmit() public {
        vm.warp(block.timestamp + 365 days);
        vm.expectEmit(true, true, false, false);
        emit Withdrawal(address(lock).balance, block.timestamp);
        lock.withdraw(recipient);
    }
}
