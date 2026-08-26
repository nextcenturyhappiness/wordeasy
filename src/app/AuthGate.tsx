import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthSession } from "./AuthSessionContext";

function AccountTransition() {
  return (
    <section className="panel panel--centered" aria-live="polite">
      <p className="eyebrow">Switching account</p>
      <h1>Preparing this account&rsquo;s local library…</h1>
      <p>
        Learning data from the previous account is hidden. Unsynced changes remain stored under that
        account.
      </p>
      <button
        className="button button--secondary"
        type="button"
        onClick={() => {
          window.location.reload();
        }}
      >
        Reload account data
      </button>
    </section>
  );
}

export function AuthGate() {
  const { session, accountUserId } = useAuthSession();
  const location = useLocation();

  if (session.status !== "authenticated") {
    return (
      <Navigate
        replace
        to="/login"
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  if (accountUserId === null || session.userId !== accountUserId) {
    return <AccountTransition />;
  }

  return <Outlet />;
}
