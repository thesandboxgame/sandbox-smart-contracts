// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;


import { Ownable2Step } from "openzeppelin-contracts/access/Ownable2Step.sol";
import { UpgradeableBeacon } from "openzeppelin-contracts/proxy/beacon/UpgradeableBeacon.sol";
import { EnumerableSet } from "openzeppelin-contracts/utils/structs/EnumerableSet.sol";
import { Address } from "openzeppelin-contracts/utils/Address.sol";
import { CollectionProxy } from "./CollectionProxy.sol";
import { IERC5313 } from "../common/IERC5313.sol";


contract CollectionFactory is Ownable2Step {

    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice list of tracked beacon addresses
    EnumerableSet.Bytes32Set internal aliases;

    /// @notice mapping alias to beacon address
    mapping(bytes32 => address) public aliasToBeacon;

    /// @notice beacon/alias count; used as a helper for off-chain operations mostly
    uint256 public beaconCount;

    /// @notice set of deployed collection addresses (Proxies)
    EnumerableSet.AddressSet internal collections;

    /// @notice collection count; used as a helper for off-chain operations mostly
    uint256 public collectionCount;

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Event emitted when a beacon was marked as followed by the factory
     * @dev emitted when deployBeacon or addBeacon is called
     * @param beaconAlias the alias (bytes32) used for this beacon
     * @param beaconAddress the marked beacon address
     */
    event BeaconAdded(bytes32 indexed beaconAlias, address indexed beaconAddress);

   /**
     * @notice Event emitted when a beacon has its implementation updated
     * @dev emitted when updateBeaconImplementation is called
     * @param oldImplementation the old beacon implementation
     * @param newImplementation the new beacon implementation
     * @param beaconAlias the alias for the used beacon
     * @param beaconAddress the new beacon address that is used
     */
    event BeaconUpdated(
        address indexed oldImplementation,
        address indexed newImplementation,
        bytes32 indexed beaconAlias,
        address beaconAddress
        );

   /**
     * @notice Event emitted when a beacon was removed from tracking
     * @dev emitted when transferBeacon is called
     * @param beaconAlias the alias of the removed beacon
     * @param beaconAddress the address of the removed beacon
     * @param newBeaconOwner the address of the new owner of the beacon
     */
    event BeaconRemoved(bytes32 indexed beaconAlias, address indexed beaconAddress, address indexed newBeaconOwner);

     /**
     * @notice Event emitted when the owner of this beacon was changed
     * @dev emitted when transferBeacon is called
     * @param oldOwner the previous owner of the beacon
     * @param newOwner the current owner of the beacon
     */
    event BeaconOwnershipChanged(address indexed oldOwner, address indexed newOwner);

    /**
     * @notice Event emitted when a collection (proxy) was deployed
     * @dev emitted when deployCollection is called
     * @param beaconAddress the used beacon address for the collection
     * @param collectionProxy the new collection proxy address
     */
    event CollectionAdded(address indexed beaconAddress, address indexed collectionProxy);

   /**
     * @notice Event emitted when a collection (proxy) was updated (had it's implementation change)
     * @dev emitted when updateCollection is called
     * @param proxyAddress the proxy address whose beacon has changed
     * @param beaconAlias the alias for the used beacon
     * @param beaconAddress the new beacon address that is used
     */
    event CollectionUpdated(address indexed proxyAddress, bytes32 indexed beaconAlias, address indexed beaconAddress);

   /**
     * @notice Event emitted when a collection was removed from tracking from a beacon
     * @dev emitted when transferCollections is called
     * @param beaconAddress the address of the beacon to which this collection points to
     * @param collectionProxy the address of the removed collection
     */
    event CollectionRemoved(address indexed beaconAddress, address indexed collectionProxy);

    /**
     * @notice Event emitted when the admin of this proxy was changed
     * @dev emitted when transferCollections is called
     * @param oldAdmin the previous admin of the collection proxy
     * @param newAdmin the current admin of the collection proxy
     */
    event CollectionProxyAdminChanged(address indexed oldAdmin, address indexed newAdmin);

    /*//////////////////////////////////////////////////////////////
                                Modifiers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Modifier used to check if a beacon is actually tracked by factory
     * @param beaconAlias the beacon address to check
     */
    modifier beaconIsAvailable(bytes32 beaconAlias) {
        require(aliasToBeacon[beaconAlias] != address(0), "CollectionFactory: beacon is not tracked");
        _;
    }

    /**
     * @notice Modifier used to check if a collection is actually tracked by factory
     * @param collection the collection address to check
     */
    modifier collectionExists(address collection) {
        require(collections.contains(collection), "CollectionFactory: collection is not tracked");
        _;
    }

    /**
     * @notice Modifier used to check if caller is the owner of the specific collection or the owner of the factory
     * @param collection the targeted collection address
     */
    modifier onlyOwners(address collection) {
        require(IERC5313(collection).owner() == msg.sender || owner() == msg.sender, "CollectionFactory: caller is not collection or factory owner");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice deploys a beacon with the provided implementation address and tracks it
     * @dev {UpgradeableBeacon} checks that implementation is actually a contract
     * @custom:event {BeaconAdded}
     * @param implementation the beacon address to be added/tracked
     * @param beaconAlias the beacon alias to be attributed to the newly deployed beacon
     * @return beacon the newly added beacon address that was launched
     */
    function deployBeacon(address implementation, bytes32 beaconAlias)
        external
        onlyOwner
        returns (address beacon)
    {
        require(beaconAlias != 0, "CollectionFactory: beacon alias cannot be empty");
        require(aliasToBeacon[beaconAlias] == address(0), "CollectionFactory: beacon alias already used");

        beacon = address(new UpgradeableBeacon(implementation));
        _saveBeacon(beacon, beaconAlias);
    }

    /**
     * @notice adds, an already deployed beacon, to be tracked/used by the factory;
     *         Beacon ownership must be transferred to this contract beforehand
     * @dev checks that implementation is actually a contract and not already added;
     *      will revert if beacon owner was not transferred to the factory beforehand
     * @custom:event {BeaconAdded}
     * @custom:event {CollectionAdded} for each collection
     * @param beacon the beacon address to be added/tracked
     * @param beaconAlias the beacon address to be added/tracked
     */
    function addBeacon(address beacon, bytes32 beaconAlias)
        external
        onlyOwner
    {
        require(beaconAlias != 0, "CollectionFactory: beacon alias cannot be empty");
        require(aliasToBeacon[beaconAlias] == address(0), "CollectionFactory: beacon alias already used");
        require(Address.isContract(beacon), "CollectionFactory: beacon is not a contract");
        require(_isFactoryBeaconOwner(beacon), "CollectionFactory: ownership must be given to factory");

        _saveBeacon(beacon, beaconAlias);
    }

    /**
     * @notice Changes the implementation pointed by the indicated beacon
     * @dev {UpgradeableBeacon.upgradeTo} checks that implementation is actually a contract
     * @custom:event {BeaconUpdated}
     * @param beaconAlias alias for the beacon for which to change the implementation
     * @param implementation the new implementation for the indicated beacon
     */
    function updateBeaconImplementation(bytes32 beaconAlias, address implementation)
        external
        onlyOwner
        beaconIsAvailable(beaconAlias)
    {
        UpgradeableBeacon beacon = UpgradeableBeacon(aliasToBeacon[beaconAlias]);
        address oldImplementation = beacon.implementation();
        beacon.upgradeTo(implementation);
        emit BeaconUpdated(oldImplementation, implementation, beaconAlias, address(beacon));
    }

    /**
     * @notice Transfers a beacon from the factory and all linked collections. Sets the owner to the provided one.
     * @custom:event {BeaconOwnershipChanged}
     * @custom:event {BeaconRemoved}
     * @param beaconAlias alias for the beacon to remove
     * @param newBeaconOwner the new owner of the beacon. It will be changed to this before removal
     */
    function transferBeacon(bytes32 beaconAlias, address newBeaconOwner)
        external
        onlyOwner
        beaconIsAvailable(beaconAlias)
    {
        require(newBeaconOwner != address(0), "CollectionFactory: new owner cannot be 0 address");
        address beacon = aliasToBeacon[beaconAlias];
        delete aliasToBeacon[beaconAlias];
        beaconCount -= 1;

        bool success = aliases.remove(beaconAlias);
        require(success, "CollectionFactory: failed to remove alias");

        UpgradeableBeacon(beacon).transferOwnership(address(newBeaconOwner));
        emit BeaconOwnershipChanged(address(this), newBeaconOwner);

        emit BeaconRemoved(beaconAlias, beacon, newBeaconOwner);
    }

    /**
     * @notice deploys a collection, making it point to the indicated beacon address
               and calls any initialization function if initializationArgs is provided
     * @dev checks that implementation is actually a contract and not already added
     * @custom:event CollectionAdded
     * @param beaconAlias alias for the beacon from which the collection will get its implementation
     * @param initializationArgs (encodeWithSignature) initialization function with arguments
     *                           to be called on newly deployed collection. If not provided,
     *                           will not call any function
     * @return collection the newly created collection address
     */
    function deployCollection(bytes32 beaconAlias, bytes calldata initializationArgs)
        public
        onlyOwner
        beaconIsAvailable(beaconAlias)
        returns (address collection)
    {
        address beacon = aliasToBeacon[beaconAlias];
        CollectionProxy collectionProxy = new CollectionProxy(beacon, initializationArgs);
        collection = address(collectionProxy);

        collections.add(collection);
        collectionCount += 1;

        emit CollectionAdded(beacon, collection);
    }

    /**
     * @notice adds collections to be tracked by the factory
     *         Collection ownership must be transferred to this contract beforehand
     * @dev Reverts if:
     *      - no collections no were given, if the {collections_} list is empty
     *      - any of the give collections is 0 address
     *      - the collection owner is not the factory
     *      - failed to add the collection (duplicate present)
     *      - the owner of the beacon pointed by the proxy is not the factory
     * @custom:event {CollectionAdded} for each collection
     * @param _collections the collections to be added to the factory
     */
    function addCollections(address[] memory _collections)
        external
        onlyOwner
    {
        require(_collections.length != 0, "CollectionFactory: empty collection list");

        uint256 collectionsLength = _collections.length;
        collectionCount += collectionsLength;
        bool success;
        address beacon;

        for (uint256 index; index < collectionsLength; ) {
            address collectionAddress = _collections[index];
            require(collectionAddress != address(0), "CollectionFactory: collection is zero address");

            CollectionProxy collection = CollectionProxy(payable(collectionAddress));
            require(collection.proxyAdmin() == address(this), "CollectionFactory: owner of collection must be factory");

            success = collections.add(address(collection));
            require(success, "CollectionFactory: failed to add collection");

            beacon = collection.beacon();
            require(_isFactoryBeaconOwner(beacon), "CollectionFactory: ownership must be given to factory");

            emit CollectionAdded(collection.beacon(), address(collection));

            unchecked {
                ++index;
            }
        }
    }

    /**
     * @notice change what beacon the collection is pointing to. If updateArgs are provided,
     *         will also call the specified function
     * @custom:event CollectionAdded
     * @param collection the collection for which the beacon to be changed
     * @param beaconAlias alias for the beacon to be used by the collection
     * @param updateArgs (encodeWithSignature) update function with arguments to be called on
     *                   the newly update collection. If not provided, will not call any function
     */
    function updateCollection(address collection, bytes32 beaconAlias, bytes memory updateArgs)
        external
        beaconIsAvailable(beaconAlias)
        collectionExists(collection)
        onlyOwners(collection)
    {
        address beacon = aliasToBeacon[beaconAlias];
        CollectionProxy(payable(collection)).changeBeacon(beacon, updateArgs);

        emit CollectionUpdated(collection, beaconAlias, beacon);
    }

    /**
     * @notice Transfers a list of collections from the factory. Sets the owner to the provided one.
     * @dev will revert it a collection from the list is not tracked by the factory or if new owner is 0 address
     * @custom:event {CollectionRemoved} for each removed collection
     * @custom:event {CollectionProxyAdminChanged}
     * @param _collections list of collections to transfer
     * @param newCollectionOwner the new owner of the beacon. It will be changed to this before transfer
     */
    function transferCollections(address[] calldata _collections, address newCollectionOwner)
        external
        onlyOwner
    {
        require(newCollectionOwner != address(0), "CollectionFactory: new owner cannot be 0 address");
        bool success;
        uint256 collectionsLength = _collections.length;
        collectionCount -= collectionsLength;

        for (uint256 index; index < collectionsLength; ) {
            CollectionProxy collection = CollectionProxy(payable(_collections[index]));

            success = collections.remove(address(collection));
            require(success, "CollectionFactory: failed to remove collection");
            emit CollectionRemoved(collection.beacon(), address(collection));

            collection.changeCollectionProxyAdmin(newCollectionOwner);
            emit CollectionProxyAdminChanged(address(this), newCollectionOwner);

            unchecked {
                ++index;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                    Public/external helper functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Helper function that retrieves all beacons tracked by the factory
     * @return list of beacons managed by the factory
     */
    function getBeacons()
        external
        view
        returns (address[] memory)
    {
        uint256 beaconCount_ = beaconCount;
        address [] memory beacons_ = new address[](beaconCount_);
        for (uint256 index = 0; index < beaconCount_; index++) {
            bytes32 beaconAlias = aliases.at(index);
            beacons_[index] = aliasToBeacon[beaconAlias];
        }
        return beacons_;
    }

    /**
     * @notice Helper function that retrieves all aliases tracked by the factory
     * @return list of aliases managed by the factory
     */
    function getBeaconAliases()
        external
        view
        returns (bytes32[] memory)
    {
        return aliases.values();
    }

    /**
     * @notice Helper function that retrieves the beacon alias from the specific index
     * @param index index at which to get the alias from
     * @return alias at that specific index
     */
    function getBeaconAlias(uint256 index)
        external
        view
        returns (bytes32)
    {
        return aliases.at(index);
    }

    /**
     * @notice Helper function that retrieves all collections tracked by the factory
     * @return list of collections managed by the factory
     */
    function getCollections()
        external
        view
        returns (address[] memory)
    {
        return collections.values();
    }

    /**
     * @notice Helper function that retrieves the collection at a specific index
     * @param index index at which to get the collection from
     * @return collection address from specific index
     */
    function getCollection(uint256 index)
        external
        view
        returns (address)
    {
        return collections.at(index);
    }

    /**
     * @notice Helper function that retrieves the beacon pointed to by the collection proxy
     * @param collection the collection for which to get the pointed beacon
     * @return the beacon address pointed by the collection
     */
    function beaconOf(address collection)
        external
        view
        collectionExists(collection)
        returns (address)
    {
        return CollectionProxy(payable(collection)).beacon();
    }

    /*//////////////////////////////////////////////////////////////
                    Other contract logic functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice function renounces ownership of contract. Currently it is disable,
     *         as to not risk losing the ability to manage/deploy collections
     * @dev reverts on call
     */
    function renounceOwnership() public virtual override onlyOwner {
        revert("CollectionFactory: renounce ownership is not available");
    }

    /*//////////////////////////////////////////////////////////////
                    Internal and private functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Saves the beacon address into internal tracking
     * @dev beacon address sanity checks must be done before calling this function
     * @custom:event {BeaconAdded}
     * @param beacon the beacon address to me marked
     * @param beaconAlias the beacon alias to be associated with this address
     */
    function _saveBeacon(address beacon, bytes32 beaconAlias) internal {
        aliases.add(beaconAlias);
        aliasToBeacon[beaconAlias] = beacon;
        beaconCount += 1;

        emit BeaconAdded(beaconAlias, beacon);
    }

    function _isFactoryBeaconOwner(address beacon) internal view returns (bool) {
        return UpgradeableBeacon(beacon).owner() == address(this);
    }
}
