// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import { BeaconProxy } from "@openzeppelin/contracts-0.8.15/proxy/beacon/BeaconProxy.sol";

/**
 * @title CollectionProxy
 * @author qed.team x The Sandbox
 * @notice Beacon Proxy extension that supports having an admin (owner equivalent) that can
 *         change the beacon to which this proxy points to. Initial admin is set to the deployer
 *
 * @dev as there are several functions added directly in the proxy, any contract behind it (implementation)
 *      must be aware that functions with the following sighash will not be reached, as they will hit the
 *      proxy and not be delegate-called to the implementation
 *
 *      Sighash   |   Function Signature
 *      =========================================
 *      f8ab7198  =>  changeBeacon(address,bytes)
 *      aac96d4b  =>  changeCollectionProxyAdmin(address)
 *      59659e90  =>  beacon()
 *      3e47158c  =>  proxyAdmin()
 *
 */
contract CollectionProxy is BeaconProxy {

    /*//////////////////////////////////////////////////////////////
                            Initializers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Collection constructor; pass-through wile setting the admin to the sender
     *         see {BeaconProxy.constructor} for more details
     * @custom:event {ERC1967Upgrade.AdminChanged}
     */
    constructor (address beacon_, bytes memory data_) BeaconProxy(beacon_, data_) {
        _changeAdmin(msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Changes the beacon to which this proxy points to
     * @dev any function from implementation address with a signature hash collision of f8ab7198 will reroute to here and cannot be executed
     *      If `data` is nonempty, it's used as data in a delegate call to the implementation returned by the beacon.
     *      Sighash   |   Function Signature
     *      =========================================
     *      f8ab7198  =>  changeBeacon(address,bytes)
     *      custom:event {ERC1967Upgrade.BeaconUpgraded}
     * @param newBeacon the new beacon address for this proxy to point to
     * @param data initialization data as an encodedWithSignature output; if exists will be called on the new implementation
     */
    function changeBeacon(address newBeacon, bytes memory data) external {
        require (msg.sender == _getAdmin(), "CollectionProxy: only admin can change beacon");
        _setBeacon(newBeacon, data);
    }

    /**
     * @notice Changes the admin of the beacon to a new provided one
     * @dev any function from implementation address with a signature hash collision of aac96d4b will reroute to here and cannot be executed
     *      Sighash   |   Function Signature
     *      ========================
     *      aac96d4b  =>  changeCollectionProxyAdmin(address)
     *      @custom:event {ERC1967Upgrade.AdminChanged}
     * @param newAdmin the new admin of the proxy
     */
    function changeCollectionProxyAdmin(address newAdmin) external {
        address admin = _getAdmin();
        require (msg.sender == admin, "CollectionProxy: only admin can change admin");
        _changeAdmin(newAdmin); // checks for "new admin is the zero address"
    }

    /**
     * @notice retrieves the currently pointed to beacon address
     * @dev any function from implementation address with a signature hash collision of 59659e90 will reroute to here and cannot be executed
     *      Sighash   |   Function Signature
     *      ========================
     *      59659e90  =>  beacon()
     * @return the address of the currently pointed to beacon
     */
    function beacon() external view returns (address){
        return _beacon();
    }

    /**
     * @notice gets the admin of the proxy
     * @dev any function from implementation address with a signature hash collision of 3e47158c will reroute to here and cannot be executed
     *      Sighash   |   Function Signature
     *      ========================
     *      3e47158c  =>  proxyAdmin()
     * @return proxy admin address
     */
    function proxyAdmin() external view returns (address) {
        return _getAdmin();
    }
}
