"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-stark/useScaffoldReadContract";

/**
 * ProtocolStats Component
 * 
 * Displays protocol-level statistics:
 * - Total Value Locked (TVL)
 * - Total Borrowed
 * - Number of Active Positions
 * - Current BTC Price (from oracle)
 */
export function ProtocolStats() {
  // For now, we'll show placeholder stats
  // In a real implementation, you'd aggregate data from multiple users
  
  const btcPrice = 100000; // This should come from the oracle
  const tvl = 0; // Would need to track total deposits
  const totalBorrowed = 0; // Would need to track total borrows
  const activePositions = 0; // Would need to track unique users

  return (
    <div className="card bg-base-100 shadow-xl p-6">
      <h2 className="card-title text-xl mb-4">📊 Protocol Statistics</h2>

      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div className="stat-title">BTC Price</div>
          <div className="stat-value text-primary">${btcPrice.toLocaleString()}</div>
          <div className="stat-desc">From Oracle</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
          </div>
          <div className="stat-title">Total Value Locked</div>
          <div className="stat-value text-secondary">${tvl.toLocaleString()}</div>
          <div className="stat-desc">Across all users</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
            </svg>
          </div>
          <div className="stat-title">Total Borrowed</div>
          <div className="stat-value text-accent">${totalBorrowed.toLocaleString()}</div>
          <div className="stat-desc">Active loans</div>
        </div>

        <div className="stat">
          <div className="stat-title">Active Positions</div>
          <div className="stat-value">{activePositions}</div>
          <div className="stat-desc">Unique users</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="alert alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs">
            <p><strong>Liquidation Threshold:</strong> 80%</p>
            <p>Maximum LTV ratio</p>
          </div>
        </div>

        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="text-xs">
            <p><strong>Collateral Asset:</strong> wBTC</p>
            <p>8 decimals precision</p>
          </div>
        </div>
      </div>
    </div>
  );
}
