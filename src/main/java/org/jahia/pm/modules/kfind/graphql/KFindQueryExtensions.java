package org.jahia.pm.modules.kfind.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNode;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNodeImpl;
import org.jahia.osgi.BundleUtils;
import org.jahia.services.content.JCRContentUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.seo.VanityUrl;
import org.jahia.services.seo.jcr.VanityUrlService;

import javax.jcr.RepositoryException;
import java.net.URI;
import java.util.List;

/**
 * Extends the Jahia GraphQL Query type with a {@code urlReverseLookup} field.
 * <p>
 * Given a live website URL, this extension resolves the target JCR node by:
 * <ol>
 * <li>Parsing the URL path</li>
 * <li>Searching for an active vanity URL matching that path</li>
 * <li>If a vanity URL match is found, returning the vanity URL's target
 * node</li>
 * <li>If no vanity URL match is found, attempting to resolve the path
 * as a direct JCR path under {@code /sites/{siteKey}}</li>
 * </ol>
 */
@GraphQLTypeExtension(DXGraphQLProvider.Query.class)
@GraphQLDescription("kfind URL reverse lookup extension")
public class KFindQueryExtensions {

    /**
     * Resolve a live website URL to its target JCR node.
     *
     * @param url     the full URL or path fragment to look up
     * @param siteKey the Jahia site key to scope the search
     * @return the matching GqlJcrNode, or null if not found
     */
    @GraphQLField
    @GraphQLName("urlReverseLookup")
    @GraphQLDescription("Resolve a live website URL to its JCR node via vanity URL or direct path matching")
    public static GqlJcrNode urlReverseLookup(
            @GraphQLNonNull @GraphQLName("url") @GraphQLDescription("The URL or path to look up") String url,
            @GraphQLNonNull @GraphQLName("siteKey") @GraphQLDescription("The Jahia site key") String siteKey) {
        try {
            JCRSessionWrapper session = JCRSessionFactory.getInstance()
                    .getCurrentUserSession("default");

            // Extract the path portion from the URL
            String path = extractPath(url);

            // 1. Try vanity URL lookup
            GqlJcrNode vanityResult = findByVanityUrl(path, siteKey, session);
            if (vanityResult != null) {
                return vanityResult;
            }

            // 2. Fallback: try direct JCR path resolution under /sites/{siteKey}
            return findByDirectPath(path, siteKey, session);
        } catch (RepositoryException e) {
            throw new RuntimeException("Error during URL reverse lookup: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts the path from a URL string. Handles both full URLs and plain paths.
     */
    private static String extractPath(String url) {
        if (url == null || url.isEmpty()) {
            return "/";
        }
        try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                URI uri = URI.create(url);
                String path = uri.getPath();
                return (path == null || path.isEmpty()) ? "/" : path;
            }
        } catch (IllegalArgumentException e) {
            // Not a valid URI — treat as a path
        }
        return url.startsWith("/") ? url : "/" + url;
    }

    /**
     * Attempts to find a node via vanity URL matching.
     */
    private static GqlJcrNode findByVanityUrl(String path, String siteKey, JCRSessionWrapper session)
            throws RepositoryException {
        VanityUrlService vanityUrlService = BundleUtils.getOsgiService(VanityUrlService.class, null);
        if (vanityUrlService == null) {
            return null;
        }

        // Try the path as-is for vanity URL lookup
        String vanityPath = path;

        // Strip common Jahia URL prefixes to get the vanity path
        // e.g., /cms/render/live/en/sites/mysite/my-page → /my-page
        // or /en/my-page → /my-page
        String sitePrefix = "/sites/" + JCRContentUtils.sqlEncode(siteKey);
        int siteIdx = vanityPath.indexOf(sitePrefix);
        if (siteIdx >= 0) {
            vanityPath = vanityPath.substring(siteIdx + sitePrefix.length());
        }

        // Also strip language prefix like /en/ or /fr/
        if (vanityPath.matches("^/[a-z]{2}(/.*)?$")) {
            vanityPath = vanityPath.substring(3); // Remove /xx
        }

        if (vanityPath.isEmpty()) {
            vanityPath = "/";
        }

        // Remove trailing .html if present
        if (vanityPath.endsWith(".html")) {
            vanityPath = vanityPath.substring(0, vanityPath.length() - 5);
        }

        List<VanityUrl> urls = vanityUrlService.findExistingVanityUrls(
                vanityPath, siteKey, session.getWorkspace().getName());

        for (VanityUrl vanityUrl : urls) {
            if (vanityUrl.isActive()) {
                try {
                    JCRNodeWrapper vanityNode = session.getNode(vanityUrl.getPath());
                    // Navigate to the target node (parent of the vanity URL node)
                    JCRNodeWrapper targetNode = vanityNode.getParent().getParent();
                    return new GqlJcrNodeImpl(targetNode);
                } catch (RepositoryException ignored) {
                    // Skip broken vanity URL entries
                }
            }
        }

        return null;
    }

    /**
     * Attempts to resolve the URL path as a direct JCR node path.
     */
    private static GqlJcrNode findByDirectPath(String path, String siteKey, JCRSessionWrapper session) {
        // Build candidate paths to try
        String siteRoot = "/sites/" + JCRContentUtils.sqlEncode(siteKey);
        String[] candidates = buildCandidatePaths(path, siteRoot);

        for (String candidate : candidates) {
            try {
                if (session.nodeExists(candidate)) {
                    JCRNodeWrapper node = session.getNode(candidate);
                    return new GqlJcrNodeImpl(node);
                }
            } catch (RepositoryException ignored) {
                // Try next candidate
            }
        }

        return null;
    }

    /**
     * Builds candidate JCR paths from a URL path, trying various transformations.
     */
    private static String[] buildCandidatePaths(String path, String siteRoot) {
        // Strip common Jahia URL prefixes
        String cleanPath = path;

        // Remove /cms/render/live/xx or /cms/render/default/xx prefix
        cleanPath = cleanPath.replaceFirst("^/cms/render/(live|default)/[a-z]{2}", "");

        // If path already contains /sites/xxx, use it directly
        if (cleanPath.startsWith("/sites/")) {
            return new String[] { cleanPath };
        }

        // Strip the site root prefix if present
        if (cleanPath.startsWith(siteRoot)) {
            cleanPath = cleanPath.substring(siteRoot.length());
        }

        // Strip language prefix like /en/ or /fr/
        if (cleanPath.matches("^/[a-z]{2}(/.*)?$")) {
            cleanPath = cleanPath.substring(3);
        }

        // Remove .html suffix
        if (cleanPath.endsWith(".html")) {
            cleanPath = cleanPath.substring(0, cleanPath.length() - 5);
        }

        if (cleanPath.isEmpty()) {
            cleanPath = "/home";
        }

        return new String[] {
                siteRoot + cleanPath,
                siteRoot + "/home" + cleanPath
        };
    }
}
