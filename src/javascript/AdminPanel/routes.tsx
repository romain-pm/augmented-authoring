import { ApolloClient, ApolloProvider, useApolloClient } from "@apollo/client";
import { DefaultEntry } from "@jahia/moonstone";
import { registry } from "@jahia/ui-extender";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { AdminPanel } from "./AdminPanel.tsx";
import { SearchModal } from "./SearchModal.tsx";
import { setApolloClient } from "./apolloClientBridge.ts";

// Rendered inside jcontent's ApolloProvider tree to capture its client
// and make it available to separate React roots (e.g. the search modal).
const CaptureApolloClient: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const client = useApolloClient();
  useEffect(() => {
    setApolloClient(client as ApolloClient<object>);
  }, [client]);
  return <>{children}</>;
};

export const registerRoutes = async () => {
  await i18n.loadNamespaces("augmented-authoring");

  // Mount the search modal once, independent of the active route, so the
  // cmd+k shortcut works from anywhere in the application.
  const modalContainer = document.createElement("div");
  modalContainer.id = "augmented-authoring-search-modal";
  document.body.appendChild(modalContainer);
  createRoot(modalContainer).render(
    <I18nextProvider i18n={i18n} defaultNS="augmented-authoring">
      <SearchModal />
    </I18nextProvider>
  );

  registry.add("adminRoute", "augmented-authoring", {
    targets: ["jcontent:10"],
    icon: <DefaultEntry />,
    label: "augmented-authoring:label",
    path: `*`, // Catch everything and let the app handle routing logic
    defaultPath: "",
    isSelectable: true,
    render: () => (
      <I18nextProvider i18n={i18n} defaultNS="augmented-authoring">
        <CaptureApolloClient>
          <AdminPanel />
        </CaptureApolloClient>
      </I18nextProvider>
    ),
  });

  console.debug("%c augmented-authoring is activated", "color: #3c8cba");
};