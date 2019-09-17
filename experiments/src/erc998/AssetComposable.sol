pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../MintPublishFee.sol";
import "../ClockAuction.sol";
import "./ComposableTopDown.sol";

contract AssetComposable is ComposableTopDown, Pausable, MintPublishFee {

    mapping (uint256 => address) tokenIdToCreator;
    mapping (uint256 => string) tokenURIs;

    constructor () public {}

    function approveAndCreateAuction(
        ClockAuction _auction,
        uint256 _tokenId,
        uint256 _startingPrice,
        uint256 _endingPrice,
        uint256 _duration
    ) public payable{
        require(msg.sender == ownerOf(_tokenId), "Only owner can approve and create an auction");
        approve(_auction, _tokenId);
        _auction.createAuction(_tokenId, _startingPrice, _endingPrice, _duration);
    }

    function mintApproveAndCreateAuction(
        ClockAuction _auction,
        string _uri,
        uint256 _startingPrice,
        uint256 _endingPrice,
        uint256 _duration
    ) public payable{
        uint256 tokenId = mint(_uri);
        approve(_auction, tokenId);
        _auction.createAuction(tokenId, _startingPrice, _endingPrice, _duration);
    }

    function mint(string _uri) 
        public 
        payable 
        whenNotPaused 
        paysFee
        returns(uint256 _tokenId)
    {
        _tokenId = super.mint(msg.sender);  
        tokenURIs[_tokenId] = _uri;
        tokenIdToCreator[_tokenId] = msg.sender;
    }

    // function burn(uint256 tokenId) public { // only creator (if still owner) // others but creator get it back ?

    /// @dev Remove all Ether from the contract, which is the owner's cut, 
    /// publishing fee, as well as any Ether sent directly to the contract address.
    /// Always transfers to the owner address
    function withdrawBalance() 
        external 
        onlyOwner 
    {
        owner.transfer(address(this).balance);
    }

    /// @dev Returns the creator of a token
    /// @param _tokenId The token id to find it's creator
    function creatorOf(uint256 _tokenId)
        external
        view
        returns(address)
    {
        return tokenIdToCreator[_tokenId];
    }

    /**
    * @dev Returns an URI for a given token ID
    * Throws if the token ID does not exist. May return an empty string.
    * @param _tokenId uint256 ID of the token to query
    */
    function tokenURI(uint256 _tokenId) public view returns (string) {
        require(exists(_tokenId), "Token doesn't exists.");
        return tokenURIs[_tokenId];
    }

    /**
    * @dev Returns whether the specified token exists
    * @param _tokenId uint256 ID of the token to query the existence of
    * @return whether the token exists
    */
    function exists(uint256 _tokenId) public view returns (bool) {
        address owner = tokenIdToTokenOwner[_tokenId];
        return owner != address(0);
    }
}
