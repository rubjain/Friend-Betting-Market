"use client";

import { useEffect, useState } from "react";
import { money, titleCase } from "../lib/formatters";

export default function AdminPaymentReviewQueue({ onMessage }) {
  const [transactions, setTransactions] = useState([]);
  const [pendingAction, setPendingAction] = useState("");
  const [notesById, setNotesById] = useState({});

  async function loadQueue() {
    try {
      const response = await fetch("/api/admin/payments");
      if (!response.ok) throw new Error("Payment review API failed.");
      const payload = await response.json();
      setTransactions(Array.isArray(payload.transactions) ? payload.transactions : []);
    } catch {
      setTransactions([]);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function review(transactionId, decision) {
    if (pendingAction) return;
    setPendingAction(`${decision}-${transactionId}`);
    try {
      const response = await fetch(`/api/admin/payments/${transactionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: notesById[transactionId] || "" }),
      });
      const payload = await response.json();
      onMessage?.(payload.message || "Payment review updated.");
      if (response.ok) {
        await loadQueue();
      }
    } catch {
      onMessage?.("Payment review could not be updated.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <div className="table-card admin-wide">
      <h3>Payment review</h3>
      <p>Withdrawals stay in manual review until finance approves or rejects the held funds.</p>
      <table className="data-table dense-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Requested</th>
            <th>Review note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length ? (
            transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td data-label="User">
                  <strong>{transaction.userName}</strong>
                  <div className="caption">{transaction.userId}</div>
                </td>
                <td data-label="Type">{titleCase(transaction.type)}</td>
                <td data-label="Amount">{money(transaction.amount)}</td>
                <td data-label="Method">{titleCase(transaction.method || transaction.provider)}</td>
                <td data-label="Requested">{transaction.createdAt.slice(0, 10)}</td>
                <td data-label="Review note">
                  <input
                    aria-label={`Review note for ${transaction.id}`}
                    value={notesById[transaction.id] || ""}
                    onChange={(event) =>
                      setNotesById((current) => ({
                        ...current,
                        [transaction.id]: event.currentTarget.value,
                      }))
                    }
                  />
                </td>
                <td data-label="Actions">
                  <div className="inline-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={!!pendingAction}
                      onClick={() => review(transaction.id, "approve")}
                    >
                      {pendingAction === `approve-${transaction.id}` ? "Approving..." : "Approve"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={!!pendingAction}
                      onClick={() => review(transaction.id, "reject")}
                    >
                      {pendingAction === `reject-${transaction.id}` ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td data-label="Payment review" colSpan="7">
                <div className="empty-note">No withdrawals are pending review.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
