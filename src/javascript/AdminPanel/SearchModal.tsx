import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ApolloProvider } from "@apollo/client";
import { SearchContent } from "./SearchPanel.tsx";
import { getApolloClient, onApolloClientReady } from "./apolloClientBridge.ts";

export const SearchModal = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [apolloClient, setApolloClientState] = useState(getApolloClient);

  // Wait for jcontent's Apollo client to be captured from the admin panel tree
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
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(8px)",
          borderRadius: "8px",
          padding: "24px",
          width: "75vw",
          maxWidth: "75vw",
          height: "75vh",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          color: "#1f2937",
          fontSize: "15px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SearchContent focusOnField onNavigate={() => setIsOpen(false)} />
      </div>
    </div>
    </ApolloProvider>,
    document.body
  );
};
