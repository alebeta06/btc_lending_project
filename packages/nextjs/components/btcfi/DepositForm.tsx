"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * DepositForm Component
 * 
 * Allows users to deposit wBTC as collateral into the lending protocol.
 * 
 * Steps:
 * 1. User enters amount of wBTC to deposit
 * 2. Approve BTCLending contract to spend wBTC (separate button)
 * 3. Call deposit_collateral function (separate button)
 */
export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  // Get user's wBTC balance
  const { data: balance } = useScaffoldReadContract({
    contractName: "MockWBTC",
    functionName: "balance_of",
    args: [address],
  });

  const { sendAsync: approve } = useScaffoldWriteContract({
    contractName: "MockWBTC",
    functionName: "approve",
    args: ["0x0", 0],
  });

  const { sendAsync: deposit } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "deposit_collateral",
    args: [0],
  });

  const handleApprove = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    try {
      setIsApproving(true);
      
      // Convert amount to BigInt (8 decimals for wBTC)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 100000000));
      
      // Get BTCLending address from deployed contracts
      const deployedContracts = await import("~~/contracts/deployedContracts");
      const btcLendingAddr = deployedContracts.default.sepolia.BTCLending.address;

      notification.info("Approving wBTC...");
      
      await approve({
        args: [btcLendingAddr, amountBigInt],
      });

      notification.success("✅ Approval successful! Now click 'Deposit' button.");
      setIsApproved(true);
    } catch (error: any) {
      console.error("Approve error:", error);
      notification.error(`Approval failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!isApproved) {
      notification.error("Please approve first");
      return;
    }

    try {
      setIsDepositing(true);
      
      // Convert amount to BigInt (8 decimals for wBTC)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 100000000));

      notification.info("Depositing collateral...");
      
      await deposit({
        args: [amountBigInt],
      });

      notification.success(`✅ Successfully deposited ${amount} wBTC!`);
      setAmount("");
      setIsApproved(false);
    } catch (error: any) {
      console.error("Deposit error:", error);
      notification.error(`Deposit failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const balanceDisplay = balance ? (Number(balance) / 100000000).toFixed(8) : "0.00000000";

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">💰 Deposit Collateral</h2>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to deposit wBTC</p>
      ) : (
        <>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Amount (wBTC)</span>
              <span className="label-text-alt">Balance: {balanceDisplay}</span>
            </label>
            <input
              type="number"
              placeholder="0.00000000"
              className="input input-bordered w-full"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setIsApproved(false); // Reset approval if amount changes
              }}
              step="0.00000001"
              min="0"
            />
            <label className="label">
              <span className="label-text-alt text-info">
                💡 Minimum: 0.00000001 wBTC
              </span>
            </label>
          </div>

          <div className="card-actions flex-col gap-2 mt-4">
            {/* Step 1: Approve Button */}
            <button
              className={`btn w-full ${isApproved ? 'btn-success' : 'btn-secondary'}`}
              onClick={handleApprove}
              disabled={!amount || parseFloat(amount) <= 0 || isApproving || isApproved}
            >
              {isApproving ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Approving...
                </>
              ) : isApproved ? (
                <>✅ Approved</>
              ) : (
                "1. Approve wBTC"
              )}
            </button>

            {/* Step 2: Deposit Button */}
            <button
              className="btn btn-primary w-full"
              onClick={handleDeposit}
              disabled={!isApproved || isDepositing}
            >
              {isDepositing ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Depositing...
                </>
              ) : (
                "2. Deposit Collateral"
              )}
            </button>
          </div>

          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p><strong>Two-Step Process:</strong></p>
              <p>1. Click &quot;Approve&quot; and confirm in wallet</p>
              <p>2. Click &quot;Deposit&quot; and confirm in wallet</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
