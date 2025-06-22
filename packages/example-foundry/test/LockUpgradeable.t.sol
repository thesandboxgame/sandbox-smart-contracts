// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {LockUpgradeable, LockUpgradeableV2} from "../src/LockUpgradeable.sol";
import "../src/Proxy.sol";

contract LockTest is Test {
    address owner = vm.addr(1);
    address notOwner = vm.addr(2);

    LockUpgradeable public implementation;
    ImplementationProxy public proxy;
    ImplementationProxyAdmin public proxyAdmin;

    ITransparentUpgradeableProxy proxyAsUpgradeable =
        ITransparentUpgradeableProxy(address(proxy));

    bytes32 internal constant IMPL_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    function checkAddressInImplSlot(address expected) internal {
        bytes32 proxySlot = vm.load(address(proxy), IMPL_SLOT);
        assertEq(proxySlot, bytes32(uint256(uint160(expected))));
    }

    function setUp() public {
        vm.startPrank(owner);
        // Deploy implementation implementation not behind proxy
        LockUpgradeable nonProxyImplementation = new LockUpgradeable();

        // Deploy proxy admin contract
        proxyAdmin = new ImplementationProxyAdmin();

        // Deploy proxy contract
        proxy = new ImplementationProxy(
            address(nonProxyImplementation),
            address(proxyAdmin),
            ""
        );
        proxyAsUpgradeable = ITransparentUpgradeableProxy(address(proxy));

        // Set what implementation deployment to use as implementation
        implementation = LockUpgradeable(
            proxyAdmin.getProxyImplementation(proxyAsUpgradeable)
        );

        vm.stopPrank();
    }

    function test_Initializable() external {
        assertFalse(implementation.initialized());

        vm.prank(owner);
        implementation.initialize(block.timestamp + 360 days);

        assertTrue(implementation.initialized());
        assertEq(implementation.unlockTime(), block.timestamp + 360 days);
    }

    function test_NonUpgradedVersion() external {
        assertEq(implementation.getVersion(), "v1");
    }

    function test_Upgrade() external {
        vm.startPrank(owner);

        LockUpgradeable currentImplementation = LockUpgradeable(
            proxyAdmin.getProxyImplementation(proxyAsUpgradeable)
        );
        checkAddressInImplSlot(address(implementation));

        currentImplementation.initialize(block.timestamp + 360 days);

        LockUpgradeableV2 newImplementation = new LockUpgradeableV2();

        proxyAdmin.upgrade(proxyAsUpgradeable, address(newImplementation));
        checkAddressInImplSlot(address(newImplementation));

        currentImplementation = LockUpgradeable(
            proxyAdmin.getProxyImplementation(proxyAsUpgradeable)
        );

        newImplementation.initialize(block.timestamp + 360 days);

        assertEq(currentImplementation.getVersion(), "v2");
    }
}
