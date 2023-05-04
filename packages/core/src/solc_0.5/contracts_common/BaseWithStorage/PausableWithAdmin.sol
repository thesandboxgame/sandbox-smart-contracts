pragma solidity ^0.5.2;

import "./Admin.sol";

/**
 * @title PausableWithAdmin
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract PausableWithAdmin is Admin {
    event Pause();
    event Unpause();

    bool public paused = false;

    /**
    * @dev Modifier to make a function callable only when the contract is not paused.
    */
    modifier whenNotPaused() {
        require(!paused);
        _;
    }

    /**
    * @dev Modifier to make a function callable only when the contract is paused.
    */
    modifier whenPaused() {
        require(paused);
        _;
    }

    /**
    * @dev called by the admin to pause, triggers stopped state
    */
    function pause() public onlyAdmin whenNotPaused {
        paused = true;
        emit Pause();
    }

    /**
    * @dev called by the admin to unpause, returns to normal state
    */
    function unpause() public onlyAdmin whenPaused {
        paused = false;
        emit Unpause();
    }
}
