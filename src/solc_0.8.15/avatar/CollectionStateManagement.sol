// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract CollectionStateManagement {

    State public currentState;

    enum State {
        DEFAULT, // 0 -> default as state variables are set to 0
        MARKETING_MINT,
        ALLOWLIST_MINT,
        PUBLIC_MINT,
        PAUSED
    }

    modifier onlyInState(State state) {
        require(currentState == state, "Operation cannot be done in current state");
        _;
    }

    function changeState(State state) public virtual {
        require(currentState != state, "Already in desired state");
        currentState = state;
    }

}