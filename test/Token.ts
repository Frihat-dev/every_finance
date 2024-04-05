import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Token", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const proxy = accounts[2];
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
    token.connect(admin).updateInvestment(proxy.address);
    holdTime.connect(owner).updateToken(token.address);

    return {
      holdTime,
      token,
      accounts,
      owner,
      admin,
      proxy,
      name,
      symbol,
    };
  }

  describe("Deployment", function () {
    it("Should set the name  ", async function () {
      const { token, accounts, owner, admin, proxy, name, symbol } =
        await deployeFixture();
      expect(await token.name()).to.equal(name);
    });

    it("Should set the symbol  ", async function () {
      const { token, accounts, owner, admin, proxy, name, symbol } =
        await deployeFixture();
      expect(await token.symbol()).to.equal(symbol);
    });

    it("Should set the DEFAULT_ADMIN_ROLE role ", async function () {
      const { token, accounts, owner, admin, proxy, name, symbol } =
        await deployeFixture();
      const ADMIN = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(ADMIN, admin.address)).to.equal(true);
    });

    it("Should set the INVESTMENT role ", async function () {
      const { token, accounts, owner, admin, proxy, name, symbol } =
        await deployeFixture();
      const INVESTMENT = await token.INVESTMENT();
      expect(await token.hasRole(INVESTMENT, proxy.address)).to.equal(true);
    });
  });

  describe("updateInvestment", function () {
    it("Should revert when caller is not admin", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const caller = accounts[4];
      const newInvestment = accounts[5].address;
      await expect(token.connect(caller).updateInvestment(newInvestment)).to.be
        .revertedWith;
    });

    it("Should revert when investment's address is zero ", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = "0x0000000000000000000000000000000000000000";
      await expect(
        token.connect(admin).updateInvestment(newInvestment)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should update investment's address in the storage", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = accounts[4].address;
      await token.connect(admin).updateInvestment(newInvestment);
      expect(await token.investment()).to.equal(newInvestment);
    });

    it("Should remove the old investment from the INVESTMENT role", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = accounts[4].address;
      const INVESTMENT = await token.INVESTMENT();
      await token.connect(admin).updateInvestment(newInvestment);
      expect(await token.hasRole(INVESTMENT, proxy.address)).to.equal(false);
    });

    it("Should remove the old investment from whitelist", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = accounts[4].address;
      await token.connect(admin).updateInvestment(newInvestment);
      expect(await token.whitelist(proxy.address)).to.equal(false);
    });

    it("Should add the new investment to the INVESTMENT role", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = accounts[4].address;
      const INVESTMENT = await token.INVESTMENT();
      await token.connect(admin).updateInvestment(newInvestment);
      expect(await token.hasRole(INVESTMENT, newInvestment)).to.equal(true);
    });

    it("Should add the new investment to whitelist", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = accounts[4].address;
      await token.connect(admin).updateInvestment(newInvestment);
      expect(await token.whitelist(newInvestment)).to.equal(true);
    });

    it("Should emit the event UpdateInvestment", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const newInvestment = accounts[4].address;
      await expect(token.connect(admin).updateInvestment(newInvestment))
        .to.emit(token, "UpdateInvestment")
        .withArgs(newInvestment);
    });
  });

  describe("updateHoldTime", function () {
    it("Should revert when caller is not admin", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const caller = accounts[4];
      const HoldTimeNew = await ethers.getContractFactory("HoldTime");
      const holdTimeNew = await HoldTimeNew.deploy();
      await expect(token.connect(caller).updateHoldTime(holdTimeNew.address)).to
        .be.revertedWith;
    });

    it("Should revert when holdTime is the zero address", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();

      const holdTimeNew = "0x0000000000000000000000000000000000000000";
      await expect(
        token.connect(admin).updateHoldTime(holdTimeNew)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should update holdTime's address in the storage", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const HoldTimeNew = await ethers.getContractFactory("HoldTime");
      const holdTimeNew = await HoldTimeNew.deploy();
      await token.connect(admin).updateHoldTime(holdTimeNew.address);
      expect(await token.holdTime()).to.equal(holdTimeNew.address);
    });

    it("Should emit the event UpdateHoldTime", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const HoldTimeNew = await ethers.getContractFactory("HoldTime");
      const holdTimeNew = await HoldTimeNew.deploy();

      await expect(token.connect(admin).updateHoldTime(holdTimeNew.address))
        .to.emit(token, "UpdateHoldTime")
        .withArgs(holdTimeNew.address);
    });
  });

  describe("addToWhitelist", function () {
    it("Should revert when caller is not admin", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const caller = accounts[4];
      await expect(token.connect(caller).addToWhiteList(accounts[4].address)).to
        .be.revertedWith;
    });

    it("Should revert when address is the zero address", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const addressToAdd = "0x0000000000000000000000000000000000000000";
      await expect(
        token.connect(admin).addToWhiteList(addressToAdd)
      ).to.be.revertedWith("Every.finance: zero address");
    });

    it("Should revert when address exists", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      await token.connect(admin).addToWhiteList(accounts[5].address);
      await expect(
        token.connect(admin).addToWhiteList(accounts[5].address)
      ).to.be.revertedWith("Every.finance: address exists");
    });

    it("Should update whitelist in the storage", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      await token.connect(admin).addToWhiteList(accounts[5].address);
      expect(await token.whitelist(accounts[5].address)).to.equal(true);
    });

    it("Should emit the event AddToWhiteList", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      await expect(token.connect(admin).addToWhiteList(accounts[5].address))
        .to.emit(token, "AddToWhiteList")
        .withArgs(accounts[5].address);
    });
  });

  describe("removeContract", function () {
    it("Should revert when caller is not admin", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const caller = accounts[4];
      await token.connect(admin).addToWhiteList(accounts[5].address);
      await expect(
        token.connect(caller).removeFromWhiteList(accounts[5].address)
      ).to.be.revertedWith;
    });

    it("Should revert when address doesn't exist", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      await expect(
        token.connect(admin).removeFromWhiteList(accounts[5].address)
      ).to.be.revertedWith("Every.finance: address doesn't exist");
    });

    it("Should update whitelist in the storage", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      await token.connect(admin).addToWhiteList(accounts[5].address);
      await token.connect(admin).removeFromWhiteList(accounts[5].address);
      expect(await token.whitelist(accounts[5].address)).to.equal(false);
    });

    it("Should emit the event RemoveFromWhiteList", async function () {
      const { token, accounts, owner, admin, proxy } = await deployeFixture();
      const contract = token.address;
      await token.connect(admin).addToWhiteList(accounts[5].address);
      await expect(
        token.connect(admin).removeFromWhiteList(accounts[5].address)
      )
        .to.emit(token, "RemoveFromWhiteList")
        .withArgs(accounts[5].address);
    });
  });
  describe("mint", function () {
    it("Should revert when caller is not Investment", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const caller = accounts[4];
      const to = accounts[3].address;
      const amount = 1_000_000_000_000_000_000_000_000n;
      await expect(token.connect(caller).mint(to, amount)).to.be.revertedWith;
    });

    it("Should revert when amount is zero", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount = 0;
      await expect(token.connect(proxy).mint(to, amount)).to.be.revertedWith(
        "Every.finance: zero amount"
      );
    });

    it("Should revert when address is zero", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = "0x0000000000000000000000000000000000000000";
      const amount = 1_000_000_000_000_000_000_000_000n;
      await expect(token.connect(proxy).mint(to, amount)).to.be.revertedWith(
        "ERC20: mint to the zero address"
      );
    });
    it("Should mint tokens for the first time", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount = 1_000_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(to, amount);
      expect(await token.balanceOf(to)).to.equal(amount);
    });

    it("Should mint tokens for many times", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 2_000n;
      const amountTotal = amount1 + amount2;
      await token.connect(proxy).mint(to, amount1);
      await token.connect(proxy).mint(to, amount2);
      expect(await token.balanceOf(to)).to.equal(amountTotal);
    });

    it("Should update FlowTime", async function () {
      const { holdTime, token, accounts, owner, proxy } =
        await deployeFixture();
      const to = accounts[4].address;
      const amount = 1_000_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(to, amount);
      const lastTime = await time.latest();
      expect(await holdTime.getHoldTime(to)).to.equal(lastTime);
    });

    it("Should emit Event Mint", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount = 1_000_000_000_000_000_000_000_000n;
      await expect(token.connect(proxy).mint(to, amount))
        .to.emit(token, "Mint")
        .withArgs(to, amount);
    });
  });

  describe("burn", function () {
    it("Should revert when caller is not investment", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const caller = accounts[4];
      const to = accounts[5].address;
      const amount = 1_000_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(to, amount);
      await expect(token.connect(caller).burn(to, amount)).to.be.revertedWith;
    });

    it("Should revert when amount is zero", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 0;
      await token.connect(proxy).mint(to, amount1);
      await expect(token.connect(proxy).burn(to, amount2)).to.be.revertedWith(
        "Every.finance: zero amount"
      );
    });

    it("Should revert when address is zero", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = "0x0000000000000000000000000000000000000000";
      const amount = 1_000_000_000_000_000_000_000_000n;
      await expect(token.connect(proxy).burn(to, amount)).to.be.revertedWith(
        "ERC20: burn from the zero address"
      );
    });

    it("Should revert when amount exceeds balance", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 1_000_000_000_000_000_000_000_001n;
      await token.connect(proxy).mint(to, amount1);
      await expect(token.connect(proxy).burn(to, amount2)).to.be.revertedWith;
    });

    it("Should burn tokens for the first time", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount1 = 2_000_000_000_000_000_000_000_000n;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const deltaAmount = amount1 - amount2;
      await token.connect(proxy).mint(to, amount1);
      await token.connect(proxy).burn(to, amount2);
      expect(await token.balanceOf(to)).to.equal(deltaAmount);
    });

    it("Should burn tokens for many times", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount1 = 2_000_000_000_000_000_000_000_000n;
      const amount2 = 1_000_000_000_000_000_000_000_000n;
      const amount3 = 500_000_000_000_000_000_000_000n;
      const deltaAmount = amount1 - amount2 - amount3;
      await token.connect(proxy).mint(to, amount1);
      await token.connect(proxy).burn(to, amount2);
      await token.connect(proxy).burn(to, amount3);
      expect(await token.balanceOf(to)).to.equal(deltaAmount);
    });

    it("Should keep HoldTime constant", async function () {
      const { holdTime, token, accounts, owner, proxy } =
        await deployeFixture();
      const to = accounts[3].address;
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 500_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(to, amount1);
      const lastTime = await time.latest();
      await token.connect(proxy).burn(to, amount2);
      expect(await holdTime.getHoldTime(to)).to.equal(lastTime);
    });

    it("Should emit Event Burn", async function () {
      const { token, accounts, owner, proxy } = await deployeFixture();
      const to = accounts[4].address;
      const amount = 1_000_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(to, amount);
      await expect(token.connect(proxy).burn(to, amount))
        .to.emit(token, "Burn")
        .withArgs(to, amount);
    });
  });

  describe("_beforeTokenTransfer", function () {
    it("Should update holdTime when to is not zero and not an whitelisted address", async function () {
      const { holdTime, token, accounts, owner, proxy } =
        await deployeFixture();
      const caller = accounts[4];
      const from = accounts[5];
      const to = accounts[6];
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 500_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(from.address, amount1);
      await token.connect(from).transfer(to.address, amount2);
      const lastTime = await time.latest();
      expect(await holdTime.getHoldTime(to.address)).to.equal(lastTime);
    });

    it("Should keep holdTime of from constant", async function () {
      const { holdTime, token, accounts, owner, proxy } =
        await deployeFixture();
      const caller = accounts[4];
      const from = accounts[5];
      const to = accounts[6];
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 500_000_000_000_000_000_000_000n;
      await token.connect(proxy).mint(from.address, amount1);
      const lastTime = await time.latest();
      await token.connect(from).transfer(to.address, amount2);
      expect(await holdTime.getHoldTime(from.address)).to.equal(lastTime);
    });

    it("Should keep holdTime of to  constant when to is whitelisted", async function () {
      const { holdTime, token, accounts, owner, admin, proxy } =
        await deployeFixture();
      const from = accounts[4];
      const to = accounts[5];
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 500_000_000_000_000_000_000_000n;
      await token.connect(admin).addToWhiteList(to.address);
      await token.connect(proxy).mint(from.address, amount1);
      await token.connect(from).transfer(to.address, amount2);
      expect(await holdTime.getHoldTime(to.address)).to.equal(0);
    });

    it("Should keep holdTime of to constant when from is whitelisted", async function () {
      const { holdTime, token, accounts, owner, admin, proxy } =
        await deployeFixture();
      const from = accounts[4];
      const to = accounts[5];
      const amount1 = 1_000_000_000_000_000_000_000_000n;
      const amount2 = 500_000_000_000_000_000_000_000n;
      await token.connect(admin).addToWhiteList(from.address);
      await token.connect(proxy).mint(from.address, amount1);
      const lastTime = await time.latest();
      await token.connect(from).transfer(to.address, amount2);
      expect(await holdTime.getHoldTime(to.address)).to.equal(0);
    });

    it("Should update holdTime of to when from is not whiteListed", async function () {
      const { holdTime, token, accounts, owner, proxy } =
        await deployeFixture();
      const from = accounts[4];
      const to = accounts[5];
      const amount1 = 1000;
      const amount2 = 500;
      await token.connect(proxy).mint(to.address, amount1);
      const lastTime1 = await time.latest();
      await token.connect(to).transfer(from.address, amount2);
      await token.connect(from).transfer(to.address, amount2);
      const lastTime2 = await time.latest();
      const expectedHoldTime = Math.round(
        (amount1 * lastTime1 + amount2 * lastTime2) / (amount1 + amount2)
      );
      expect(await holdTime.getHoldTime(to.address)).to.equal(expectedHoldTime);
    });
  });
});
