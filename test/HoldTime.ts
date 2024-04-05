import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("HoldTime", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const investment = accounts[2];
    const name = "ALPHA";
    const symbol = "ALPHA";
    const HoldTime = await ethers.getContractFactory("HoldTime");
    const holdTime = await HoldTime.deploy();
    const Token = await ethers.getContractFactory("contracts/common/Token.sol:Token");
    const token = await Token.deploy(
      name,
      symbol,
      holdTime.address,
      admin.address
    );
    await token.connect(admin).updateInvestment(investment.address);
    await holdTime.connect(owner).updateToken(token.address);

    return { holdTime, token, accounts, owner, admin, investment };
  }

  describe("Deployment", function () {
    it("Should set the Role Owner to owner  ", async function () {
      const { holdTime, token, accounts, owner, admin } =
        await deployeFixture();
      expect(await holdTime.owner()).to.equal(owner.address);
    });
  });

  describe("updateToken", function () {
    it("Should revert when Token's address is zero", async function () {
      const { holdTime, token, accounts, owner, admin } =
        await deployeFixture();
      const tokenAddress = "0x0000000000000000000000000000000000000000";
      await expect(
        holdTime.connect(owner).updateToken(tokenAddress)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should update token's address in the storage", async function () {
      const { holdTime, token, accounts, owner, admin } =
        await deployeFixture();
      const name = "ALPHA";
      const symbol = "ALPHA";
      const Token2 = await ethers.getContractFactory("contracts/common/Token.sol:Token");
      const token2 = await Token2.deploy(
        name,
        symbol,
        admin.address,
        holdTime.address
      );
      await holdTime.connect(owner).updateToken(token2.address);
      expect(await holdTime.token()).to.equal(token2.address);
    });

    it("Should emit the event UpdateToken", async function () {
      const { holdTime, token, accounts, owner, admin } =
        await deployeFixture();
      const name = "ALPHA";
      const symbol = "ALPHA";
      const Token2 = await ethers.getContractFactory("contracts/common/Token.sol:Token");
      const token2 = await Token2.deploy(
        name,
        symbol,
        holdTime.address,
        admin.address
      );
      await expect(holdTime.connect(owner).updateToken(token2.address))
        .to.emit(holdTime, "UpdateToken")
        .withArgs(token2.address);
    });
  });

  describe("updateHoldTime", function () {
    it("Should revert when caller is not Token", async function () {
      const { holdTime, token, accounts, owner, admin, investment } =
        await deployeFixture();
      const caller = accounts[3];
      const investor = accounts[4].address;
      const amount = 1_000_000_000_000_000_000_000n;
      await expect(
        holdTime.connect(caller).updateHoldTime(investor, amount)
      ).to.be.revertedWith("Every.finance: caller is not token");
    });

    it("Should update holdTimes in the storage when tokens are minted for the first time", async function () {
      const { holdTime, token, accounts, owner, admin, investment } =
        await deployeFixture();
      const investor = accounts[4].address;
      const amount = 1_000_000_000_000_000_000_000n;
      await token.connect(investment).mint(investor, amount);
      const lastTime = await time.latest();
      expect(await holdTime.getHoldTime(investor)).to.equal(lastTime);
    });

    it("Should update holdTimes in the storage when tokens are minted many times", async function () {
      const { holdTime, token, accounts, owner, admin, investment } =
        await deployeFixture();
      const investor = accounts[4].address;
      const amount1 = 1000;
      const amount2 = 2000;
      const deltaTime = 3600;
      await token.connect(investment).mint(investor, amount1);
      const lastTime1 = await time.latest();
      await time.increaseTo(lastTime1 + 3600);
      await token.connect(investment).mint(investor, amount2);
      const lastTime2 = await time.latest();
      const expectedFlowTime = Math.floor(
        (amount1 * lastTime1 + amount2 * lastTime2) / (amount1 + amount2)
      );
      const holdingTime = (await holdTime.getHoldTime(investor)).toNumber();
      expect(expectedFlowTime).to.equal(holdingTime);
    });

    it("Should emit the event UpdateHoldTime", async function () {
      const { holdTime, token, accounts, owner, admin, investment } =
        await deployeFixture();
      const investor = accounts[4].address;
      const amount = 1000;
      await expect(token.connect(investment).mint(investor, amount)).to.emit(
        holdTime,
        "UpdateHoldTime"
      );
    });
  });
});
