const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { expect } = require('chai');
const { createSingleNftAndApproveAuction } = require('./fixtures');

describe('DoublyLinkedListStack', () => {
  const listingFee = ethers.utils.parseEther('0.1');
  let startingPrice;
  let nftLister;
  let nftFactAddr;
  let nftAuctionAddr;
  let currentNft;
  beforeEach(async () => {
    const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
      createSingleNftAndApproveAuction
    );
    nftAuctionAddr = nftAuction.address;
    nftFactAddr = nftFactory.address;
    nftLister = randAccount_1;
    startingPrice = ethers.utils.parseEther('1');
    const tokenId = 1;
    await nftAuction
      .connect(randAccount_1)
      .listNft(nftFactory.address, tokenId, startingPrice, {
        value: listingFee,
      });
    currentNft = await nftAuction.getCurrentNft();
  });
  it('Pushes item onto stack', async () => {
    expect(currentNft.length).to.equal(4);
  });
  it('Sets node nftListing', async () => {
    expect(currentNft[0].length).to.equal(6);
  });
  it('Sets node key', async () => {
    expect(currentNft[1].length).to.equal(66);
  });
  it('Sets node next', async () => {
    expect(currentNft[2].length).to.equal(66);
  });
  it('Sets node prev', async () => {
    expect(currentNft[3].length).to.equal(66);
  });
});
