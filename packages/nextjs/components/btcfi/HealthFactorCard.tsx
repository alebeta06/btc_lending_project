"use client";

import { useAccount } from "@starknet-react/core";
import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";

/**
 * HealthFactorCard Component
 * 
 * Displays the user's Health Factor in real-time.
 * Health Factor = (Collateral Value * Liquidation Threshold) / Debt
 * 
 * - Green: > 1.5 (Safe)
 * - Yellow: 1.0 - 1.5 (Warning)
 * - Red: < 1.0 (Liquidation Risk)
 */
export function HealthFactorCard() {
  const { address } = useAccount();

  const { data: healthFactor, isLoading } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "calculate_health_factor",
    args: address ? [address] : undefined,
  });

  const { data: collateral } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_collateral",
    args: address ? [address] : undefined,
  });

  const { data: debt } = useScaffoldReadContract({
    contractName: "BTCLending",
    functionName: "get_user_debt",
    args: address ? [address] : undefined,
  });

  if (!address) {
    return (
      <div className="card bg-base-100 shadow-xl p-6">
        <h2 className="card-title text-xl mb-4">💚 Health Factor</h2>
        <p className="text-center opacity-70">Connect your wallet to view your Health Factor</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl p-6">
        <h2 className="card-title text-xl mb-4">💚 Health Factor</h2>
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  // Convert BigInt to number for display (health factor is scaled by 100)
  const hfValue = healthFactor ? Number(healthFactor) / 100 : 0;
  const collateralValue = collateral ? Number(collateral) / 100000000 : 0; // 8 decimals
  const debtValue = debt ? Number(debt) / 10000000000000 : 0; // 13 decimals

  // Determine color based on health factor
  let statusColor = "text-success";
  let statusEmoji = "💚";
  let statusText = "Safe";

  if (hfValue === 0) {
    statusColor = "text-info";
    statusEmoji = "ℹ️";
    statusText = "No Debt";
  } else if (hfValue < 1.0) {
    statusColor = "text-error";
    statusEmoji = "🔴";
    statusText = "Liquidation Risk!";
  } else if (hfValue < 1.5) {
    statusColor = "text-warning";
    statusEmoji = "⚠️";
    statusText = "Warning";
  }

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">{statusEmoji} Health Factor</h2>
      
      <div className="stats stats-vertical shadow w-full bg-base-200">
        <div className="stat">
          <div className="stat-title opacity-70 text-xs">Health Factor</div>
          <div className={`stat-value text-3xl font-bold ${statusColor}`}>
            {hfValue === 0 ? "∞" : hfValue.toFixed(2)}
          </div>
          <div className="stat-desc opacity-60 text-xs">{statusText}</div>
        </div>

        <div className="stat">
          <div className="stat-title opacity-70 text-xs">Collateral</div>
          <div className="stat-value text-xl font-bold">{collateralValue.toFixed(4)}</div>
          <div className="stat-desc opacity-60 text-xs">wBTC</div>
        </div>

        <div className="stat">
          <div className="stat-title opacity-70 text-xs">Debt</div>
          <div className="stat-value text-xl font-bold">{debtValue.toFixed(2)}</div>
          <div className="stat-desc opacity-60 text-xs">USD</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-xs">
            <p><strong>Health Factor</strong> measures your position safety.</p>
            <p>Below 1.0 = You can be liquidated!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
