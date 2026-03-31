import gql from 'graphql-tag';

type CreateNodeResult = {
    data?: {
        jcr?: {
            addNode?: {
                path?: string;
            };
            nodesByPath?: Array<{path: string; name: string; uuid: string}>;
        };
    };
    errors?: unknown;
};

const CREATE_NODE_MUTATION = gql`
    mutation CreateNode(
        $parentPathOrId: String!
        $name: String!
        $primaryNodeType: String!
        $properties: [InputJCRProperty]
    ) {
        jcr(workspace: EDIT) {
            addNode(
                parentPathOrId: $parentPathOrId
                name: $name
                primaryNodeType: $primaryNodeType
                useAvailableNodeName: true
                properties: $properties
            ) {
                path
                name
                uuid
            }
        }
    }
`;

const NODES_BY_PATH_QUERY = gql`
    query NodesByPath($path: String!) {
        jcr(workspace: EDIT) {
            nodesByPath(paths: [$path]) {
                path
                name
                uuid
            }
        }
    }
`;

export const openSearchModal = () => {
    cy.get('body').type('{ctrl}k');
    cy.get('.search-modal', {timeout: 10000}).should('be.visible');
    cy.get('.search-modal input[type="text"]', {timeout: 10000}).as('searchInput').should('be.visible');
};

export const closeSearchModal = () => {
    cy.get('body').type('{esc}');
    cy.get('.search-modal').should('not.exist');
};

export const searchInModal = (query: string) => {
    openSearchModal();
    cy.get('@searchInput').clear();
    cy.get('@searchInput').type(query);
};

export const createPageViaGraphql = (siteKey: string, pageName: string, pageTitle: string) =>
    cy.apollo({
        mutation: CREATE_NODE_MUTATION,
        variables: {
            parentPathOrId: `/sites/${siteKey}/home`,
            name: pageName,
            primaryNodeType: 'jnt:page',
            properties: [
                {
                    name: 'jcr:title',
                    language: 'en',
                    value: pageTitle
                }
            ]
        }
    }).then((result: CreateNodeResult) => {
        expect(result.errors, 'GraphQL errors while creating page').to.be.undefined;
        expect(result?.data?.jcr?.addNode?.path, 'created page path').to.be.a('string');
        return result;
    });

const ensureMediaRoot = (siteKey: string) => {
    const mediaRootPath = `/sites/${siteKey}/files`;

    return cy.apollo({
        query: NODES_BY_PATH_QUERY,
        variables: {path: mediaRootPath}
    }).then((result: CreateNodeResult) => {
        const nodes = result?.data?.jcr?.nodesByPath ?? [];
        if (nodes.length > 0) {
            return;
        }

        return cy.apollo({
            mutation: CREATE_NODE_MUTATION,
            variables: {
                parentPathOrId: `/sites/${siteKey}`,
                name: 'files',
                primaryNodeType: 'jnt:contentFolder',
                properties: [
                    {
                        name: 'jcr:title',
                        language: 'en',
                        value: 'Files'
                    }
                ]
            }
        }).then((createResult: CreateNodeResult) => {
            expect(createResult.errors, 'GraphQL errors while creating /files').to.be.undefined;
        });
    });
};

export const createMediaViaGraphql = (siteKey: string, fileName: string) =>
    ensureMediaRoot(siteKey).then(() =>
        cy.apollo({
            mutation: CREATE_NODE_MUTATION,
            variables: {
                parentPathOrId: `/sites/${siteKey}/files`,
                name: fileName,
                primaryNodeType: 'jnt:file'
            }
        }).then((result: CreateNodeResult) => {
            expect(result.errors, 'GraphQL errors while creating media').to.be.undefined;
            expect(result?.data?.jcr?.addNode?.path, 'created media path').to.be.a('string');
            return result;
        })
    );
