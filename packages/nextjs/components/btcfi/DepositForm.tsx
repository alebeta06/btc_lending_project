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
 * 2. Approve BTCLending contract to spend wBTC
 * 3. Call deposit_collateral function
 */
export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Get user's wBTC balance
  const { data: balance } = useScaffoldReadContract({
    contractName: "MockWBTC",
    functionName: "balance_of",
    args: address ? [address] : undefined,
  });

  // Get BTCLending contract address from deployedContracts
  const { data: btcLendingAddress } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_collateral", // Just to get the contract address
    args: address ? [address] : undefined,
  });

  const { writeAsync: approve } = useScaffoldWriteContract({
    contractName: "MockWBTC",
    functionName: "approve",
  });

  const { writeAsync: deposit } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "deposit_collateral",
  });

  const handleDeposit = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    try {
      // Convert amount to BigInt (8 decimals for wBTC)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 100000000));

      // Step 1: Approve
      setIsApproving(true);
      notification.info("Step 1/2: Approving wBTC...");
      
      // Get BTCLending address from deployed contracts
      const deployedContracts = await import("~~/contracts/deployedContracts");
      const btcLendingAddr = deployedContracts.default.devnet.BTCLending.address;

      await approve({
        args: [btcLendingAddr, amountBigInt],
      });

      notification.success("✅ Approval successful!");
      setIsApproving(false);

      // Step 2: Deposit
      notification.info("Step 2/2: Depositing collateral...");
      await deposit({
        args: [amountBigInt],
      });

      notification.success(`✅ Successfully deposited ${amount} wBTC!`);
      setAmount("");
    } catch (error: any) {
      console.error("Deposit error:", error);
      notification.error(`Failed: ${error.message || "Unknown error"}`);
      setIsApproving(false);
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
              onChange={(e) => setAmount(e.target.value)}
              step="0.00000001"
              min="0"
            />
            <label className="label">
              <span className="label-text-alt text-info">
                💡 Minimum: 0.00000001 wBTC
              </span>
            </label>
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary w-full"
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0 || isApproving}
            >
              {isApproving ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Approving...
                </>
              ) : (
                "Deposit Collateral"
              )}
            </button>
          </div>

          <div className="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p><strong>Note:</strong> This requires 2 transactions:</p>
              <p>1. Approve wBTC spending</p>
              <p>2. Deposit collateral</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
