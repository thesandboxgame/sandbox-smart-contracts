// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity 0.8.2;

abstract contract LandStorageAbstract {
    uint256[500] private _initialGap;

    function $superOperators() internal view virtual returns (mapping(address => bool) storage);

    function $numNFTPerAddress() internal view virtual returns (mapping(address => uint256) storage);

    function $owners() internal view virtual returns (mapping(uint256 => uint256) storage);

    function $operators() internal view virtual returns (mapping(uint256 => address) storage);

    function $operatorsForAll() internal view virtual returns (mapping(address => mapping(address => bool)) storage);

    function $minters() internal view virtual returns (mapping(address => bool) storage);

    function $getAdmin() internal view virtual returns (address);

    function $setAdmin(address) internal virtual;

    function $getOperatorFilterRegistry() internal view virtual returns (address);

    function $setOperatorFilterRegistry(address) internal virtual;
}
