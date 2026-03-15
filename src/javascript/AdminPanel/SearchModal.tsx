import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ApolloProvider } from "@apollo/client";
import { SearchContent } from "./SearchPanel.tsx";
import { getApolloClient, onApolloClientReady } from "./apolloClientBridge.ts";
import { getSiteKey } from "./searchUtils.ts";

export const SearchModal = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [apolloClient, setApolloClientState] = useState(getApolloClient);

  // Wait for jcontent's Apollo client to be captured from the primary nav tree
  useEffect(() => {
    onApolloClientReady(() => setApolloClientState(getApolloClient()));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    const targets: Document[] = [document];
    try {
      if (window.parent && window.parent.document && window.parent !== window) {
        targets.push(window.parent.document);
      }
    } catch (_) {
      // cross-origin parent — skip
    }

    targets.forEach((t) => t.addEventListener("keydown", handleKeyDown));
    window.addEventListener("augmented-authoring:open-search", handleOpenEvent);
    return () => {
      targets.forEach((t) => t.removeEventListener("keydown", handleKeyDown));
      window.removeEventListener("augmented-authoring:open-search", handleOpenEvent);
    };
  }, []);

  if (!isOpen) return null;
  if (!apolloClient) return null;

  return createPortal(
    <ApolloProvider client={apolloClient}>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("search.modal.label", "Search")}
      style={{
        position: "fixed",
        inset: 0,
        /* Semi-transparent backdrop dims the page without fully hiding it */
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          /* Frosted-glass effect: slightly translucent white with blur */
          background: "rgba(255, 255, 255, 0.76)",
          backdropFilter: "blur(8px)",
          borderRadius: "8px",
          padding: "24px 28px",
          width: "60vw",
          maxWidth: "800px",
          height: "88vh",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          color: "var(--color-dark)",
          fontSize: "15px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "20px", color: "var(--color-dark)" }}>
              {t("search.modal.title", "Search in {{site}}", { site: getSiteKey() })}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <SearchContent focusOnField onNavigate={() => setIsOpen(false)} />
          </div>
          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--color-gray)", marginTop: "12px", paddingTop: "8px", fontSize: "13px", color: "var(--color-dark)" }}>
            {t("search.modal.hint", "Press Ctrl+K or ⌘K to open · Esc to close · ↑↓ navigate · Enter to go · E to edit")}
          </div>
        </div>
      </div>
    </div>
    </ApolloProvider>,
    document.body
  );
};
