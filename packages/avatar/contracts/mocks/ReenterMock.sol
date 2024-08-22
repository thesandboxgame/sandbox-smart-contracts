// SPDX-License-Identifier: MIT
// solhint-disable one-contract-per-file
pragma solidity 0.8.26;

contract ReenterMock {
    struct MintArgs {
        CollectionInterface target;
        address wallet;
        uint256 amount;
        uint256 signatureId;
        bytes signature;
    }

    struct AllowedArgs {
        CollectionInterface target;
        address minterToken;
    }

    MintArgs public mintArgs;
    AllowedArgs public allowedArgs;

    function mintReenter(
        CollectionInterface _target,
        address _wallet,
        uint256 _amount,
        uint256 _signatureId,
        bytes calldata _signature
    ) external {
        mintArgs = MintArgs({target : _target, wallet : _wallet, amount : _amount, signatureId : _signatureId, signature : _signature});
        _target.mint(_wallet, _amount, _signatureId, _signature);
    }

    function setAllowedExecuteMintReenter(CollectionInterface _target, address _minterToken) external {
        allowedArgs = AllowedArgs({target : _target, minterToken : _minterToken});
        _target.setAllowedExecuteMint(_minterToken);
    }

    // reenter setAllowedExecuteMint
    function decimals() external returns (uint256) {
        allowedArgs.target.setAllowedExecuteMint(allowedArgs.minterToken);
        return 12;
    }

    // reenter mint
    function transferFrom(
        address,
        address,
        uint256
    ) external {
        mintArgs.target.mint(mintArgs.wallet, mintArgs.amount, mintArgs.signatureId, mintArgs.signature);
    }

}

interface CollectionInterface {
    function mint(
        address _wallet,
        uint256 _amount,
        uint256 _signatureId,
        bytes calldata _signature
    ) external;

    function setAllowedExecuteMint(address _minterToken) external;

}