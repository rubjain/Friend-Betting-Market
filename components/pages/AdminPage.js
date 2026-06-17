"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminDashboard from "../AdminDashboard";
import { useAgora } from "../../context/AgoraContext";

export default function AdminPage() {
  const router = useRouter();
  const { state, hydrated, actions } = useAgora();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || state.currentUser.isAdmin) {
      redirectedRef.current = false;
      return;
    }

    if (redirectedRef.current) return;
    redirectedRef.current = true;
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
