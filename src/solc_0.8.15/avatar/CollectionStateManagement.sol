// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

contract CollectionStateManagement {

    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice the current state of the collection contract; Values are defined in the State enum
    State public currentState;

    /// @notice Possible states in which the collection contract will be
    enum State {
        IDLE,           // 0; default as state variables are set to 0
        MARKETING_MINT, // 1
        ALLOWLIST_MINT, // 2
        PUBLIC_MINT     // 3
    }

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Event emitted when the contract state was changed
     * @dev emitted when changeState is called
     * @param oldState the previous contract state
     * @param newState the new contract state
     */
    event StateChanged(State indexed oldState, State indexed newState);

    /*//////////////////////////////////////////////////////////////
                                Modifiers
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Modifier used to check if we are in specific state
     * @param state the beacon address to check
     */
    modifier onlyInState(State state) {
        require(currentState == state, "CollectionStateManagement: operation cannot be done in current state");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Changes the current contract state
     *         WARNING this must be overwritten if you want to add control modifiers to it
     * @dev will revert if we are already in the desired state
     * @custom:event {StateChanged}
     * @param state the state in which the contract will change
     */
    function changeState(State state) public virtual {
        State oldState = currentState;
        require(oldState != state, "CollectionStateManagement: already in desired state");
        currentState = state;

        emit StateChanged(oldState, state);
    }
}
