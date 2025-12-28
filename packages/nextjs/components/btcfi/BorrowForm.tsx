"use client";

import { useState } from "react";
import { useAccount } from "@starknet-react/core";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-stark/useScaffoldWriteContract";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-stark";

/**
 * BorrowForm Component
 * 
 * Allows users to borrow stablecoins against their wBTC collateral.
 * 
 * Requirements:
 * - User must have deposited collateral
 * - Borrow amount must maintain Health Factor > 1.0
 * - Maximum borrow = (Collateral Value * Liquidation Threshold) - Current Debt
 */
export function BorrowForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  // Get user's collateral
  const { data: collateral } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_collateral",
    args: address ? [address] : undefined,
  });

  // Get user's current debt
  const { data: debt } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_debt",
    args: address ? [address] : undefined,
  });

  // Get health factor
  const { data: healthFactor } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "calculate_health_factor",
    args: address ? [address] : undefined,
  });

  const { writeAsync: borrow } = useScaffoldWriteContract({
    contractName: "BTCLending",
    functionName: "borrow",
  });

  const handleBorrow = async () => {
    if (!address) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    const collateralValue = collateral ? Number(collateral) / 100000000 : 0;
    if (collateralValue === 0) {
      notification.error("You must deposit collateral first");
      return;
    }

    try {
      // Convert amount to BigInt (13 decimals for USD debt)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10000000000000));

      notification.info("Borrowing...");
      await borrow({
        args: [amountBigInt],
      });

      notification.success(`✅ Successfully borrowed $${amount}!`);
      setAmount("");
    } catch (error: any) {
      console.error("Borrow error:", error);
      notification.error(`Failed: ${error.message || "Unknown error"}`);
    }
  };

  const collateralValue = collateral ? Number(collateral) / 100000000 : 0;
  const debtValue = debt ? Number(debt) / 10000000000000 : 0;
  const hfValue = healthFactor ? Number(healthFactor) / 10000 : 0;

  // Calculate max borrow (assuming 80% LTV and BTC price of $100,000)
  const btcPrice = 100000; // This should come from oracle
  const maxBorrow = Math.max(0, (collateralValue * btcPrice * 0.8) - debtValue);

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">💸 Borrow</h2>

      {!address ? (
        <p className="text-center opacity-70">Connect your wallet to borrow</p>
      ) : collateralValue === 0 ? (
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>You need to deposit collateral first!</span>
        </div>
      ) : (
        <>
          <div className="stats stats-vertical shadow mb-4">
            <div className="stat">
              <div className="stat-title">Your Collateral</div>
              <div className="stat-value text-2xl">{collateralValue.toFixed(8)} wBTC</div>
              <div className="stat-desc">≈ ${(collateralValue * btcPrice).toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Current Debt</div>
              <div className="stat-value text-2xl">${debtValue.toFixed(2)}</div>
              <div className="stat-desc">Health Factor: {hfValue === 0 ? "∞" : hfValue.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Max Borrow</div>
              <div className="stat-value text-2xl text-success">${maxBorrow.toFixed(2)}</div>
              <div className="stat-desc">80% LTV</div>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Amount (USD)</span>
              <span className="label-text-alt">Max: ${maxBorrow.toFixed(2)}</span>
            </label>
            <input
              type="number"
              placeholder="0.00"
              className="input input-bordered w-full"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              max={maxBorrow}
            />
            <label className="label">
              <span className="label-text-alt text-info">
                💡 Keep Health Factor above 1.0 to avoid liquidation
              </span>
            </label>
          </div>

          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-primary w-full"
              onClick={handleBorrow}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxBorrow}
            >
              Borrow ${amount || "0.00"}
            </button>
          </div>

          <div className="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div className="text-xs">
              <p><strong>Liquidation Threshold:</strong> 80%</p>
              <p>If your Health Factor drops below 1.0, you can be liquidated!</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
