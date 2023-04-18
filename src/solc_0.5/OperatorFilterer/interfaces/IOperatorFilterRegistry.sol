//SPDX-License-Identifier: MIT
pragma solidity 0.5.9;

/**
 * @title IOperatorFilterRegistry
 * @author OpenSea
 * @notice Interface of the operator filter registry
 * @dev This interface comes from OpenSea https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/IOperatorFilterRegistry.sol
 */
interface IOperatorFilterRegistry {
    /**
     * @notice Check if the operator is allowed for the given registrant
     * @param registrant address of the registrant
     * @param operator operator address to check
     * @return is the operator allowed
     */
    function isOperatorAllowed(address registrant, address operator) external view returns (bool);

    /**
     * @notice Register a new address
     * @param registrant address to register
     */
    function register(address registrant) external;

    /**
     * @notice Register a new address & subscribe to an address
     * @param registrant address of the registrant
     * @param subscription address where the registrant is subscribed to
     */
    function registerAndSubscribe(address registrant, address subscription) external;

    /**
     * @notice Register and copy entries of another registrant
     * @param registrant address of the registrant
     * @param registrantToCopy address to copy from
     */
    function registerAndCopyEntries(address registrant, address registrantToCopy) external;

    /**
     * @notice update the operator for a registrant
     * @param registrant address of the registrant
     * @param operator operator to be updated
     * @param filtered is it filtered
     */
    function updateOperator(
        address registrant,
        address operator,
        bool filtered
    ) external;

    /**
     * @notice Update operators for a registrant
     * @param registrant address of the registrant
     * @param operators addresses of the operators
     * @param filtered is it filtered
     */
    function updateOperators(
        address registrant,
        address[] calldata operators,
        bool filtered
    ) external;

    /**
     * @notice Update code hash
     * @param registrant address of the registrant
     * @param codehash code hash
     * @param filtered is it filtered
     */
    function updateCodeHash(
        address registrant,
        bytes32 codehash,
        bool filtered
    ) external;

    /**
     * @notice Update code hashes
     * @param registrant address of the registrant
     * @param codeHashes code hashes
     * @param filtered is it filtered
     */
    function updateCodeHashes(
        address registrant,
        bytes32[] calldata codeHashes,
        bool filtered
    ) external;

    /**
     * @notice Subscribe a registrant
     * @param registrant address of the registrant
     * @param registrantToSubscribe address to subscribe with
     */
    function subscribe(address registrant, address registrantToSubscribe) external;

    /**
     * @notice Unsubscribe a registrant
     * @param registrant address of the registrant
     * @param copyExistingEntries copy existing entries
     */
    function unsubscribe(address registrant, bool copyExistingEntries) external;

    /**
     * @notice Get the subscription of an address
     * @param addr address to check
     * @return the registrant address
     */
    function subscriptionOf(address addr) external returns (address registrant);

    /**
     * @notice Get the subscribers of the registrant
     * @param registrant address of the registrant
     * @return the subscribers addresses
     */
    function subscribers(address registrant) external returns (address[] memory);

    /**
     * @notice Get a specific subscriber
     * @param registrant address of the registrant
     * @param index index to check
     * @return the ith subscriber of the registrant
     */
    function subscriberAt(address registrant, uint256 index) external returns (address);

    /**
     * @notice Copy the entries of a registrant
     * @param registrant address of the registrant
     * @param registrantToCopy address to copy
     */
    function copyEntriesOf(address registrant, address registrantToCopy) external;

    /**
     * @notice Is a registrant filtered
     * @param registrant address of the registrant
     * @param operator operator address to check
     * @return is it filtered
     */
    function isOperatorFiltered(address registrant, address operator) external returns (bool);

    /**
     * @notice Is the code hash of an operator filtered
     * @param registrant address of the registrant
     * @param operatorWithCode operator address to check
     * @return is it filtered
     */
    function isCodeHashOfFiltered(address registrant, address operatorWithCode) external returns (bool);

    /**
     * @notice Is the code hash filtered
     * @param registrant address of the registrant
     * @param codeHash code hash
     * @return is it filtered
     */
    function isCodeHashFiltered(address registrant, bytes32 codeHash) external returns (bool);

    /**
     * @notice Get the filtered operators
     * @param addr address to check
     * @return filtered operators
     */
    function filteredOperators(address addr) external returns (address[] memory);

    /**
     * @notice Get the filtered code hashes
     * @param addr address to check
     * @return filtered code hashes
     */
    function filteredCodeHashes(address addr) external returns (bytes32[] memory);

    /**
     * @notice Get a specific operator
     * @param registrant address of the registrant
     * @param index index to check
     * @return address of the operator
     */
    function filteredOperatorAt(address registrant, uint256 index) external returns (address);

    /**
     * @notice Get the ith filtered code hash
     * @param registrant address of the registrant
     * @param index index to check
     * @return the code hash
     */
    function filteredCodeHashAt(address registrant, uint256 index) external returns (bytes32);

    /**
     * @notice Is the address registered
     * @param addr address to check
     * @return is it registered
     */
    function isRegistered(address addr) external returns (bool);

    /**
     * @notice Get the code hash for this address
     * @param addr address to check
     * @return the code hash
     */
    function codeHashOf(address addr) external returns (bytes32);
}
