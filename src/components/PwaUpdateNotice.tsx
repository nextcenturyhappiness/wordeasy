import { useEffect, useState } from "react";

import {
  applyPwaUpdate,
  getPwaUpdateDetail,
  PWA_UPDATE_EVENT,
  type PwaUpdateDetail
} from "../pwa/updateCoordinator";

export function PwaUpdateNotice() {
  const [detail, setDetail] = useState<PwaUpdateDetail>(getPwaUpdateDetail);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      setDetail((event as CustomEvent<PwaUpdateDetail>).detail);
    };
    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate);
    };
  }, []);

  if (
    detail.status !== "update-available" &&
    detail.status !== "updating" &&
    detail.status !== "error"
  ) {
    return null;
  }

  return (
    <div className="pwa-update-notice" role={detail.status === "error" ? "alert" : "status"}>
      <p>
        {detail.status === "update-available"
          ? "A new version is ready. Apply it when you are not saving a rating."
          : detail.status === "updating"
            ? "Applying the update…"
            : (detail.message ?? "The app update could not be applied.")}
      </p>
      {detail.status === "update-available" ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={() => {
            void applyPwaUpdate();
          }}
        >
          Update safely
        </button>
      ) : null}
    </div>
  );
}
