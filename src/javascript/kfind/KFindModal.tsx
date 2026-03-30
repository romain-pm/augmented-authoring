/**
 * Root modal component for the kFind search dialog.
 *
 * - Opens/closes via Cmd+K / Ctrl+K / Escape or the `kfind:open-search` custom event.
 * - Wraps the search panel in an ApolloProvider using jcontent's captured client.
 * - Footer displays keyboard hints and build timestamp.
 *
 * This component mounts once at app startup (see routes.tsx) and persists
 * for the lifetime of the page.
 */
import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ApolloProvider} from '@apollo/client';
import {Modal, ModalFooter, Typography} from '@jahia/moonstone';
import {KFindPanel} from './KFindPanel/KFindPanel.tsx';
function logModalDebug(message: string, error: unknown): void {
    if (!__DEV_BUILD__) {
        return;
    }

    console.debug(`[kfind][modal] ${message}`, error);
}

export const KFindModal = () => {
    const {t} = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // Apollo client is provided by Jahia's platform on window.jahia.apolloClient
    // before any module's registerRoutes fires — no async wait needed.
    const apolloClient = window.jahia?.apolloClient;

    // ── Keyboard shortcut & custom event listeners ──
    // Registered on both the iframe document and the parent document so the
    // shortcut works regardless of which frame has focus.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        const handleOpenEvent = () => setIsOpen(true);

        const targets: Document[] = [document];
        try {
            if (window.parent && window.parent.document && window.parent !== window) {
                targets.push(window.parent.document);
            }
        } catch (error) {
            // Cross-origin parent — skip
            logModalDebug('Unable to register parent keyboard listener', error);
        }

        targets.forEach(targetDoc =>
            targetDoc.addEventListener('keydown', handleKeyDown)
        );
        window.addEventListener('kfind:open-search', handleOpenEvent);
        return () => {
            targets.forEach(targetDoc =>
                targetDoc.removeEventListener('keydown', handleKeyDown)
            );
            window.removeEventListener('kfind:open-search', handleOpenEvent);
        };
    }, []);

    if (!apolloClient) {
        console.error(
            '[kfind] Apollo client is not available — modal cannot render.'
        );
        return null;
    }

    return (
        <>
            <style>
                {`
        .search-modal.moonstone-modal { top: 32px; bottom: 32px; height: auto; max-height: none; }
        .search-modal .moonstone-modal_body { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
      `}
            </style>
            <Modal
        isOpen={isOpen}
        size="full"
        className="search-modal"
        style={{width: '800px'}}
        onOpenChange={setIsOpen}
            >
                <>
                    <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden'
            }}
                    >
                        <ApolloProvider client={apolloClient}>
                            <KFindPanel focusOnField onNavigate={() => setIsOpen(false)}/>
                        </ApolloProvider>
                    </div>
                    <ModalFooter>
                        <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%'
              }}
                        >
                            <Typography variant="caption">
                                {t(
                  'search.modal.hint',
                  'Press Ctrl+K or ⌘K to open · Esc to close · ↑↓ navigate · Enter to go · E to edit'
                )}
                            </Typography>
                            {/* Build time shown only in dev builds; __DEV_BUILD__ is replaced at compile time by Vite */}
                            {__DEV_BUILD__ && (
                            <Typography variant="caption" style={{opacity: 0.4}}>
                                {window.contextJsParameters.kfind?.buildTime ?? ''}
                            </Typography>
              )}
                        </div>
                    </ModalFooter>
                </>
            </Modal>
        </>
    );
};
