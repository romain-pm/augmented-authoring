import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApolloProvider } from "@apollo/client";
import { Modal, ModalFooter, Typography } from "@jahia/moonstone";
import { KFindPanel } from "./KFindPanel.tsx";
import { getApolloClient, onApolloClientReady } from "./apolloClientBridge.ts";

export const KFindModal = () => {
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
    window.addEventListener("kFind:open-search", handleOpenEvent);
    return () => {
      targets.forEach((t) => t.removeEventListener("keydown", handleKeyDown));
      window.removeEventListener("kFind:open-search", handleOpenEvent);
    };
  }, []);

  if (!apolloClient) return null;

  return (
    <ApolloProvider client={apolloClient}>
      <style>{`
        .search-modal.moonstone-modal { top: 48px; bottom: 48px; height: auto; max-height: none; }
        .search-modal .moonstone-modal_body { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
      `}</style>
      <Modal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        size="full"
        className="search-modal"
        style={{ width: "800px" }}
      >
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <KFindPanel focusOnField onNavigate={() => setIsOpen(false)} />
          </div>
          <ModalFooter>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <Typography variant="caption">
                {t(
                  "search.modal.hint",
                  "Press Ctrl+K or ⌘K to open · Esc to close · ↑↓ navigate · Enter to go · E to edit",
                )}
              </Typography>
              <Typography variant="caption" style={{ opacity: 0.4 }}>
                {new Date(__BUILD_TIME__).toLocaleString()}
              </Typography>
            </div>
          </ModalFooter>
        </>
      </Modal>
    </ApolloProvider>
  );
};
