const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { expect } = require('chai');
const contractFixtures = require('./fixtures');

describe('NftAuction', () => {
  describe('Deployment', () => {
    it('Deploys NftAuction smart contract', async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      expect(nftAuction.address.length).to.equal(42);
    });
    it('Sets the correct auction owner address', async () => {
      const { nftAuction, auctionOwner } = await loadFixture(contractFixtures);
      expect(await nftAuction.auctionOwner()).to.equal(auctionOwner.address);
    });
    it('Sets the correct auction listing fee', async () => {
      const { nftAuction, listingFee } = await loadFixture(contractFixtures);
      expect(await nftAuction.listingFee()).to.equal(listingFee);
    });
    it('Sets the initial auction state', async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      const inactive = 0;
      expect(await nftAuction.auctionState()).to.equal(inactive);
    });
  });
  describe('Listing an Nft', () => {
    describe('Lists nft for auction', () => {
      let startingPrice;
      let randSigner;
      let nftFactAddr;
      let nftAuctionAddr;
      let currentNft;
      let nftFactoryInstance;
      beforeEach(async () => {
        const { nftAuction, listingFee, nftFactory, randAccount_1 } =
          await loadFixture(contractFixtures);
        nftAuctionAddr = nftAuction.address;
        nftFactAddr = nftFactory.address;
        randSigner = randAccount_1;
        nftFactoryInstance = nftFactory;
        const tokenUri = 'https://testtokenuri.uri';
        await nftFactory.connect(randSigner).createCollectable(tokenUri);
        const tokenId = 1;
        await nftFactory.connect(randSigner).approve(nftAuctionAddr, tokenId);
        startingPrice = ethers.utils.parseEther('1');
        await nftAuction
          .connect(randSigner)
          .listNft(nftFactAddr, tokenId, startingPrice, {
            value: listingFee,
          });
        currentNft = await nftAuction.getCurrentNft();
      });
      it('Sets listing ID to Nft ID 1', async () => {
        expect(currentNft[0][0]).to.equal(1);
      });
      it('Sets listing starting price to 1 ETH', async () => {
        expect(currentNft[0][1]).to.equal(startingPrice);
      });
      it('Sets listing isAuctioning boolean to false', async () => {
        expect(currentNft[0][2]).to.equal(false);
      });
      it('Sets listing token factory addr to Nft collection addr', async () => {
        expect(currentNft[0][3]).to.equal(nftFactAddr);
      });
      it('Sets listing token seller addr to Nft lister', async () => {
        expect(currentNft[0][4]).to.equal(randSigner.address);
      });
      it('Sets listing owner addr to Nft auction contract', async () => {
        expect(currentNft[0][5]).to.equal(nftAuctionAddr);
      });
      it('Transfers ownership of nft from lister to auction smart contract', async () => {
        const tokenId = 1;
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          nftAuctionAddr
        );
      });
    });
    it('Lists multiple Nfts for auction', async () => {
      const { nftAuction, listingFee, nftFactory, nftFactoryDeployer } =
        await loadFixture(contractFixtures);
      let nftId = 1;
      const startingPrice = ethers.utils.parseEther(nftId.toString());
      for (let i = 0; i < 5; i++) {
        const tokenUri = `https://testtokenuri.uri_${nftId}`;
        await nftFactory.createCollectable(tokenUri);
        await nftAuction.listNft(nftFactory.address, nftId, startingPrice, {
          value: listingFee,
        });
        const currentNft = await nftAuction.getCurrentNft();
        expect(currentNft[0][0]).to.equal(nftId);
        nftId++;
      }
      const nftListings = await nftAuction.getAllListings();
      expect(nftListings.length).to.equal(5);
    });
  });
  describe('Delisting an Nft', () => {
    it('Removes Nft from the top of the stack', async () => {
      const { nftAuction, listingFee, nftFactory } = await loadFixture(
        contractFixtures
      );
      const startingPrice = ethers.utils.parseEther('1');
      const tokenId = 1;
      await nftAuction.listNft(nftFactory.address, tokenId, startingPrice, {
        value: listingFee,
      });
      expect(await nftAuction.stackSize()).to.equal(1);
      await nftAuction.auctionNextNft();
      expect(await nftAuction.stackSize()).to.equal(0);
    });
    it('Removes individual Nft listing from anywhere in stack', async () => {
      const { nftAuction, listingFee, nftFactory } = await loadFixture(
        contractFixtures
      );
      const startingPrice = ethers.utils.parseEther('1');
      for (let i = 0; i < 3; i++) {
        const tokenId = i;
        await nftAuction.listNft(nftFactory.address, tokenId, startingPrice, {
          value: listingFee,
        });
      }
      const nftListingsBeforeDelist = await nftAuction.getAllListings();
      expect(nftListingsBeforeDelist.length).to.equal(3);
      const secondListingNodeKey = nftListingsBeforeDelist[1].key;
      await nftAuction.delistNft(secondListingNodeKey);
      const nftListingsAfterDelist = await nftAuction.getAllListings();
      expect(nftListingsAfterDelist.length).to.equal(2);
    });
    it('Removes individual Nft listings and reasigns next and prev keys', async () => {
      const { nftAuction, listingFee, nftFactory } = await loadFixture(
        contractFixtures
      );
      const startingPrice = ethers.utils.parseEther('1');
      for (let i = 0; i < 3; i++) {
        const tokenId = i;
        await nftAuction.listNft(nftFactory.address, tokenId, startingPrice, {
          value: listingFee,
        });
      }
      const nftListingsBeforeDelist = await nftAuction.getAllListings();
      const firstListingNextKey = nftListingsBeforeDelist[0].next;
      const firstListingKey = nftListingsBeforeDelist[0].key;
      const secondListingKey = nftListingsBeforeDelist[1].key;
      const thirdListingKey = nftListingsBeforeDelist[2].key;
      expect(firstListingNextKey).to.equal(secondListingKey);
      await nftAuction.delistNft(secondListingKey);
      const nftListingsAfterDelist = await nftAuction.getAllListings();
      expect(nftListingsAfterDelist[0].next).to.equal(thirdListingKey);
      expect(nftListingsAfterDelist[1].prev).to.equal(firstListingKey);
    });
  });
});
