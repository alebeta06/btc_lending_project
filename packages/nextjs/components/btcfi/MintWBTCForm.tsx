"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * MintWBTCForm Component
 * 
 * Allows users to mint test wBTC tokens for development/testing.
 * This is only available because we're using MockWBTC.
 * 
 * In production, users would need to:
 * 1. Bridge real BTC to Starknet
 * 2. Or buy wBTC from a DEX
 */
export function MintWBTCForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  // Get user's current wBTC balance
  const { data: balance } = useScaffoldReadContract({
    contractName: "MockWBTC",
    functionName: "balance_of",
    args: [address],
  });

  const { sendAsync: mint } = useScaffoldWriteContract({
    contractName: "MockWBTC",
    functionName: "mint",
    args: [undefined, undefined], // Placeholder args - will be provided when calling mint()
  });

  const handleMint = async () => {
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

      notification.info("Minting wBTC...");
      await mint({ args: [address, amountBigInt] });

      notification.success(`✅ Successfully minted ${amount} wBTC!`);
      setAmount("");
    } catch (error: any) {
      console.error("Mint error:", error);
      notification.error(`Failed: ${error.message || "Unknown error"}`);
    }
  };

  const balanceDisplay = balance ? (Number(balance) / 100000000).toFixed(8) : "0.00000000";

  // Quick mint buttons for common amounts
  const quickMintAmounts = [
    { label: "0.01 wBTC", value: "0.01" },
    { label: "0.1 wBTC", value: "0.1" },
    { label: "1 wBTC", value: "1" },
    { label: "10 wBTC", value: "10" },
  ];

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">🪙 Mint Test wBTC</h2>

      {/* Testnet Disclaimer */}
      <div className="alert alert-warning mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="text-xs">
          <p><strong>⚠️ Testnet Only</strong></p>
          <p>This function only exists for testing. These tokens have no real value.</p>
        </div>
      </div>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to mint test wBTC</p>
      ) : (
        <>
          <div className="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p><strong>Step 1:</strong> Mint test wBTC tokens</p>
              <p><strong>Step 2:</strong> Deposit as collateral below</p>
            </div>
          </div>

          <div className="stats shadow mb-4 w-full bg-base-200">
            <div className="stat">
              <div className="stat-title opacity-70">Your wBTC Balance</div>
              <div className="stat-value text-2xl font-bold">{balanceDisplay}</div>
              <div className="stat-desc opacity-60">Mock Bitcoin (8 decimals)</div>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Amount to Mint (wBTC)</span>
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
          </div>

          {/* Quick Mint Buttons */}
          <div className="mt-4">
            <label className="label">
              <span className="label-text text-sm opacity-70">Quick Mint:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickMintAmounts.map((preset) => (
                <button
                  key={preset.value}
                  className="btn btn-sm btn-outline"
                  onClick={() => setAmount(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary w-full"
              onClick={handleMint}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              🪙 Mint {amount || "0"} wBTC
            </button>
          </div>

          <div className="alert alert-warning mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-xs">
              <p><strong>⚠️ Development Only:</strong></p>
              <p>This mint function only exists in MockWBTC for testing.</p>
              <p>In production, you&apos;d need real wBTC from a bridge or DEX.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
