import {PrimaryNavItem, Search} from '@jahia/moonstone';
import {registry} from '@jahia/ui-extender';
import i18n from 'i18next';
import {I18nextProvider} from 'react-i18next';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {KFindModal} from './KFindModal.tsx';

const NavSearchButton: React.FC = () => (
    <PrimaryNavItem
    icon={<Search/>}
    label="Search"
    onClick={() => window.dispatchEvent(new CustomEvent('kfind:open-search'))}
  />
);

export const registerRoutes = async () => {
    await i18n.loadNamespaces('kfind');

    // Align i18next language with Jahia's UI language so our translations
    // resolve correctly regardless of which language the user has selected.
    const uilang = window.contextJsParameters?.uilang ?? 'en';
    if (i18n.language !== uilang) {
        await i18n.changeLanguage(uilang);
    }

    // Mount the search modal once, independent of the active route, so the
    // cmd+k shortcut works from anywhere in the application.
    const modalContainer = document.createElement('div');
    modalContainer.id = 'kfind-search-modal';
    document.body.appendChild(modalContainer);
    createRoot(modalContainer).render(
        <I18nextProvider i18n={i18n} defaultNS="kfind">
            <KFindModal/>
        </I18nextProvider>
    );

    registry.add('primary-nav-item', 'kfind-search', {
        targets: ['nav-root-top:99'],
        requireModuleInstalledOnSite: 'kfind',
        render: () => <NavSearchButton/>
    });

    console.debug('%c kfind is activated', 'color: #3c8cba');
};
