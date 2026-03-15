import { ApolloClient, useApolloClient } from "@apollo/client";
import type { NormalizedCacheObject } from "@apollo/client";
import { PrimaryNavItem, Search } from "@jahia/moonstone";
import { registry } from "@jahia/ui-extender";
import i18n from "i18next";
import { I18nextProvider } from "react-i18next";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { SearchModal } from "./SearchModal.tsx";
import { setApolloClient } from "./apolloClientBridge.ts";

// NavSearchButton lives inside jcontent's ApolloProvider tree, so
// useApolloClient() gives us the host's client. We store it in the bridge
// so our separate React roots (modal, etc.) can use it without needing
// their own provider.
function useStoreApolloClient() {
  const client = useApolloClient();
  useEffect(() => {
    setApolloClient(client as ApolloClient<NormalizedCacheObject>);
  }, [client]);
}
// Captures jcontent's Apollo client as soon as the primary nav renders
// (i.e. at app startup, before any search is performed).
const NavSearchButton: React.FC = () => {
  useStoreApolloClient();
  return (
    <PrimaryNavItem
      icon={<Search />}
      label="Search"
      onClick={() => window.dispatchEvent(new CustomEvent("augmented-authoring:open-search"))}
    />
  );
};

export const registerRoutes = async () => {
  await i18n.loadNamespaces("augmented-authoring");

  // Align i18next language with Jahia's UI language so our translations
  // resolve correctly regardless of which language the user has selected.
  const uilang = window.contextJsParameters?.uilang ?? "en";
  if (i18n.language !== uilang) {
    await i18n.changeLanguage(uilang);
  }

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

  registry.add("primary-nav-item", "augmented-authoring-search", {
    targets: ["nav-root-top:99"],
    requireModuleInstalledOnSite: 'augmented-authoring',
    render: () => <NavSearchButton />,
  });

  console.debug("%c augmented-authoring is activated", "color: #3c8cba");
};