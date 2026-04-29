"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "../AdminDashboard";
import { useFriendMarket } from "../../context/FriendMarketContext";

export default function AdminPage() {
  const router = useRouter();
  const { state, hydrated, actions } = useFriendMarket();

  useEffect(() => {
    if (!hydrated || state.currentUser.isAdmin) {
      return;
    }

    actions.setFlashMessage("Admin access requires an admin account or the dev admin shortcut.");
    router.replace("/profile");
  }, [actions, hydrated, router, state.currentUser.isAdmin]);

  if (!hydrated || !state.currentUser.isAdmin) {
    return (
      <section className="page active">
        <div className="list-card">
          <h3>Admin dashboard</h3>
          <p>Checking admin access...</p>
        </div>
      </section>
    );
  }

  return <AdminDashboard />;
}
