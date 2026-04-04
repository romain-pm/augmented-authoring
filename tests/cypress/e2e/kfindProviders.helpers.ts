// ---------------------------------------------------------------------------
// GraphQL mutations / queries
//
// All requests go through gqlRequest() which uses cy.request() with an explicit
// Origin header. cy.apollo() / cross-fetch cannot set Origin, so Jahia's CSRF
// filter blocks those calls with HTTP 200 + "Permission denied".
// ---------------------------------------------------------------------------

const ADD_NODE_MUTATION = `
mutation addNode($parentPathOrId: String!, $name: String!, $primaryNodeType: String!, $properties: [InputJCRProperty], $mixins: [String]) {
    jcr(workspace: EDIT) {
        addNode(parentPathOrId: $parentPathOrId, name: $name, primaryNodeType: $primaryNodeType, properties: $properties, mixins: $mixins) {
            uuid
        }
    }
}`;

// jnt:file requires a mandatory jcr:content child (jnt:resource) with both
// jcr:mimeType and jcr:data. The $file variable is the form-field key name;
// Jahia resolves the binary from that field in the multipart body.
const UPLOAD_FILE_MUTATION = `
mutation upload($file: String!, $parentPathOrId: String!, $name: String!) {
    jcr {
        addNode(parentPathOrId: $parentPathOrId, name: $name, primaryNodeType: "jnt:file") {
            addChild(name: "jcr:content", primaryNodeType: "jnt:resource") {
                c: mutateProperty(name: "jcr:data") { setValue(type: BINARY, value: $file) }
                m: mutateProperty(name: "jcr:mimeType") { setValue(value: "text/plain") }
            }
            uuid
        }
    }
}`;

const GET_NODE_BY_PATH_QUERY = `
query getNodeByPath($path: String!) {
    jcr(workspace: EDIT) {
        nodeByPath(path: $path) {
            uuid
        }
    }
}`;

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

type GraphQLResult = {
    data?: {
        jcr?: {
            addNode?: {uuid?: string} | null;
            nodeByPath?: {uuid?: string} | null;
        } | null;
    } | null;
    errors?: unknown;
};

const gqlRequest = (body: Record<string, unknown>): Cypress.Chainable<any> =>
    cy
        .request<GraphQLResult>({
            method: 'POST',
            url: '/modules/graphql',
            headers: {
                'Content-Type': 'application/json',
                Origin: Cypress.config('baseUrl')
            },
            auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
            body
        })
        .then(response => response.body);

const addNode = (variables: {
    parentPathOrId: string;
    name: string;
    primaryNodeType: string;
    properties?: Array<{name: string; language?: string; value: string}>;
    mixins?: string[];
}) => gqlRequest({query: ADD_NODE_MUTATION, variables});

const getNodeByPath = (path: string) => gqlRequest({query: GET_NODE_BY_PATH_QUERY, variables: {path}});

// ---------------------------------------------------------------------------
// Shared test site key
// ---------------------------------------------------------------------------

export const SITE_KEY = 'kfind-test-site';

const pad2 = (value: number) => value.toString().padStart(2, '0');

export const createTestToken = (date = new Date()) => {
    const year = date.getFullYear();
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());

    return `${year}${day}${month}-${hours}${minutes}`;
};

// ---------------------------------------------------------------------------
// Modal interaction helpers
// ---------------------------------------------------------------------------

export const openSearchModal = () => {
    const panelSelector = '[data-kfind-panel="true"]';
    const modalSelector = '[data-kfind-modal="true"]';

    // Wait for kfind to mount its modal container — once #kfind-search-modal
    // exists, the KFindModal useEffect has run and the kfind:open-search
    // listener is registered on window.
    cy.get('#kfind-search-modal', {timeout: 30000}).should('exist');

    cy.get('body').then($body => {
        if ($body.find(`${panelSelector}:visible`).length > 0) {
            return;
        }

        cy.window().then(win => {
            const dispatchOpenEvent = (target: any) => {
                target.dispatchEvent(new target.CustomEvent('kfind:open-search'));
            };

            const dispatchOpenShortcut = (targetWindow: any) => {
                const evt = new targetWindow.KeyboardEvent('keydown', {
                    key: 'k',
                    ctrlKey: true,
                    bubbles: true
                });

                targetWindow.document.dispatchEvent(evt);
            };

            // Trigger the same open paths as production UX (event + shortcut).
            dispatchOpenEvent(win);
            dispatchOpenShortcut(win);

            try {
                const parentWindow = (win as any).parent;
                if (parentWindow && parentWindow !== win) {
                    dispatchOpenEvent(parentWindow);
                    dispatchOpenShortcut(parentWindow);
                }
            } catch {
                // Ignore cross-context parent access issues.
            }
        });
    });

    cy.get('body').then($body => {
        if ($body.find(`${panelSelector}:visible`).length > 0) {
            return;
        }

        // Last-resort fallback for environments where synthetic events are ignored.
        cy.get('body').type('{ctrl}k');
    });

    cy.get(modalSelector, {timeout: 10000}).should('be.visible');
    cy.get(panelSelector, {timeout: 10000}).should('be.visible');
    cy.get('[data-kfind-search-input-wrapper="true"] input[type="search"]', {timeout: 10000})
        .as('searchInput')
        .should('be.visible');
};

export const closeSearchModal = () => {
    cy.get('body').type('{esc}');
    cy.get('body').then($body => {
        if ($body.find('[data-kfind-panel="true"]').length === 0) {
            return;
        }

        cy.get('[data-kfind-panel="true"]').should('not.be.visible');
    });
};

export const searchInModal = (query: string) => {
    openSearchModal();
    cy.get('@searchInput').clear();
    cy.get('@searchInput').type(query);
};

// ---------------------------------------------------------------------------
// Content creation helpers
// ---------------------------------------------------------------------------

// jnt:page requires j:templateName (mandatory constraint). The ensureHomePage
// guard creates /home if createSite's template import hasn't done it yet.
export const createPageViaGraphql = (siteKey: string, pageName: string, pageTitle: string) => {
    const ensureHomePage = () =>
        getNodeByPath(`/sites/${siteKey}/home`).then((result: GraphQLResult) => {
            if (result?.data?.jcr?.nodeByPath?.uuid) {
                return;
            }

            return addNode({
                parentPathOrId: `/sites/${siteKey}`,
                name: 'home',
                primaryNodeType: 'jnt:page',
                properties: [
                    {name: 'jcr:title', language: 'en', value: 'Home'},
                    {name: 'j:templateName', value: 'base'}
                ]
            }).then((createResult: GraphQLResult) => {
                expect(createResult.errors, 'GraphQL errors while creating home page').to.be.undefined;
            });
        });

    return ensureHomePage().then(() =>
        addNode({
            parentPathOrId: `/sites/${siteKey}/home`,
            name: pageName,
            primaryNodeType: 'jnt:page',
            properties: [
                {
                    name: 'jcr:title',
                    language: 'en',
                    value: pageTitle
                },
                {
                    name: 'j:templateName',
                    value: 'base'
                }
            ]
        }).then((result: GraphQLResult) => {
            expect(result.errors, 'GraphQL errors while creating page').to.be.undefined;
            expect(result?.data?.jcr?.addNode?.uuid, 'created page uuid').to.be.a('string');
            return result;
        })
    );
};

// Guards against a race between createSite (async Groovy provisioning) and the
// first file-creation call: /files is normally created by the template set
// import, but if it isn't ready yet this will create it as jnt:folder.
// Note: jnt:file nodes require a jnt:folder parent, NOT jnt:contentFolder.
const ensureMediaRoot = (siteKey: string) => {
    const mediaRootPath = `/sites/${siteKey}/files`;

    return getNodeByPath(mediaRootPath).then((result: GraphQLResult) => {
        if (result?.data?.jcr?.nodeByPath?.uuid) {
            return;
        }

        return addNode({
            parentPathOrId: `/sites/${siteKey}`,
            name: 'files',
            primaryNodeType: 'jnt:folder',
            properties: [
                {
                    name: 'jcr:title',
                    language: 'en',
                    value: 'Files'
                }
            ]
        }).then((createResult: GraphQLResult) => {
            expect(createResult.errors, 'GraphQL errors while creating /files').to.be.undefined;
        });
    });
};

// Uploads a jnt:file via GraphQL multipart.
//
// cy.request does not serialize FormData correctly, so the multipart body is
// built manually as a raw string. Jahia's convention: the $file variable holds
// the form-field key name (e.g. "filedata"); the server reads the binary from
// that named field — do NOT use the graphql-multipart-spec null+map approach
// (that causes Jahia to store "org.apache...@xxx" as jcr:data).
//
// File content is derived from the filename (hyphens → spaces, no extension)
// so that full-text search can find the file by keyword phrases. Lucene treats
// hyphens as NOT operators, so search terms with hyphens won't match hyphenated
// filenames — content with spaces is more reliably indexed.
const uploadFile = (parentPathOrId: string, name: string): Cypress.Chainable<any> => {
    const boundary = `CypressBoundary${Date.now()}`;
    const fileKey = 'filedata';
    const fileContent = name.replace(/-/g, ' ').replace(/\.\w+$/, '');

    const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="query"`,
        '',
        UPLOAD_FILE_MUTATION,
        `--${boundary}`,
        `Content-Disposition: form-data; name="variables"`,
        '',
        JSON.stringify({file: fileKey, parentPathOrId, name}),
        `--${boundary}`,
        `Content-Disposition: form-data; name="${fileKey}"; filename="${name}"`,
        'Content-Type: text/plain',
        '',
        fileContent,
        `--${boundary}--`
    ].join('\r\n');

    return cy
        .request<GraphQLResult>({
            method: 'POST',
            url: '/modules/graphql',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                Origin: Cypress.config('baseUrl')
            },
            auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
            body
        })
        .then(response => response.body);
};

export const createMediaViaGraphql = (siteKey: string, fileName: string) =>
    ensureMediaRoot(siteKey).then(() =>
        uploadFile(`/sites/${siteKey}/files`, fileName).then((result: GraphQLResult) => {
            expect(result.errors, 'GraphQL errors while creating media').to.be.undefined;
            expect(result?.data?.jcr?.addNode?.uuid, 'created media uuid').to.be.a('string');
            return result;
        })
    );

// kfindtest:mainResource (defined in the kfind-test-module CND) extends
// jnt:content + jmix:mainResource. It cannot be placed under jnt:contentFolder
// — only under jnt:page (e.g. /home). The kfind main-resources provider
// searches site-wide via pathType: ANCESTOR, so location doesn't affect results.
export const createMainResourceViaGraphql = (siteKey: string, nodeName: string, title: string) =>
    addNode({
        parentPathOrId: `/sites/${siteKey}/home`,
        name: nodeName,
        primaryNodeType: 'kfindtest:mainResource',
        properties: [
            {
                name: 'jcr:title',
                language: 'en',
                value: title
            }
        ]
    }).then((result: GraphQLResult) => {
        expect(result.errors, 'GraphQL errors while creating main resource').to.be.undefined;
        expect(result?.data?.jcr?.addNode?.uuid, 'created main resource uuid').to.be.a('string');
        return result;
    });
