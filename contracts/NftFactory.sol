// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @notice - Gives the user an the ability to mint ERC721 tokens.
 */
contract NftFactory is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    /**
     * @notice - Allows the user to give a name and symbol to their collection.
     * @param _collectionName - The name for the NFT collection.
     * @param _collectionSymbol - The symbol for the NFT collection.
     */
    constructor(string memory _collectionName, string memory _collectionSymbol)
        ERC721(_collectionName, _collectionSymbol)
    {}

    /**
     * @notice - Mints an NFT to the collection.
     * @param _tokenURI - The metadata to be associated with the NFT.
     */
    function createCollectable(string memory _tokenURI)
        public
        onlyOwner
        returns (uint256)
    {
        _tokenIds.increment();
        _mint(msg.sender, _tokenIds.current());
        _setTokenURI(_tokenIds.current(), _tokenURI);
        return _tokenIds.current();
    }
}
