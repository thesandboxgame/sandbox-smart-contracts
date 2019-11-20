pragma solidity 0.5.9;

import "./ERC721BaseToken.sol";
import "./LandBaseToken.sol";

// contract EstateOwner {
//     address _owner;
//     address _controller;
//     constructor(
//         address owner,
//         address controller
//     ) {
//         _owner = owner;
//         _controller = controller
//     }
// }
// contract EstateBaseToken is ERC721BaseToken {

//     constructor(
//         address metaTransactionContract,
//         address admin
//     ) public ERC721BaseToken(metaTransactionContract, admin) {
//     }

//     function createEstate(address from) external returns(uint256 id) {
//         EstateOwner estateOwner = new EstateOwner(from, address(this)));
//         uint256 estateId = uint256(address(estateOwner));
//         emit Transfer(address(0), from, estateId);
//     }
// ...
/////////////////////////////////////////////////////////

contract EstateBaseToken is ERC721BaseToken {

    uint256 internal constant GRID_SIZE = 408; // TODO share Land map size

    LandBaseToken _land;
    constructor(
        address metaTransactionContract,
        address admin,
        LandBaseToken land
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _land = land;
    }

    function createFromQuad(address sender, address to, uint256 size, uint256 x, uint256 y) external {
        require(sender != address(0), "sender is zero address");
        _land.transferQuad(sender, address(this), size, x, y, ""); // this require approval
        uint256 id = size * 2**32 + x + y * GRID_SIZE;
        _owners[id] = uint256(to);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, id);
    }

    function destroy(address sender, address to, uint256 id) external {
        require(sender != address(0), "sender is zero address");
        require(msg.sender == sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender],
            "not authorized");
        require(sender == _ownerOf(id), "only owner can destroy estate");
        uint256 size = id / 2**32;
        uint256 coords = id % 2**32;
        uint256 x = coords % GRID_SIZE;
        uint256 y = coords / GRID_SIZE;

        _land.transferQuad(address(this), to, size, x, y, "");
        _owners[id] = 0;
        _numNFTPerAddress[sender]--;
        emit Transfer(sender, address(0), id);
    }

    // function create(address from, uint256[] calldata ids) external {
    //     require(ids.length > 0, "no ids provided");
    // }

    // function addLands(address from, uint256 estateId, uint256 joinId, uint256[] calldata ids) external {
    //     address owner = _ownerOf(estateId);
    //     require(owner != address(0), "estate does not exist");
    //     require(ids.length > 0, "no ids provided");
    // }

    // function destroy() {
    //     // token destroyed but Land up for grabs
    // }

}
