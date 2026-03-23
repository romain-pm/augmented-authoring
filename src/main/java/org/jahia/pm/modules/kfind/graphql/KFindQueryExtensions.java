package org.jahia.pm.modules.kfind.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.apache.commons.lang.StringUtils;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNode;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNodeImpl;
import org.jahia.osgi.BundleUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.seo.VanityUrl;
import org.jahia.services.seo.jcr.VanityUrlManager;
import org.jahia.services.seo.jcr.VanityUrlService;

import javax.jcr.RepositoryException;
import java.net.URI;
import java.util.List;
import java.util.regex.Pattern;

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

    private static final Pattern SITE_KEY_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]+$");
    private static final String VANITY_MAPPINGS_SEGMENT = "/" + VanityUrlManager.VANITYURLMAPPINGS_NODE + "/";

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
        if (!SITE_KEY_PATTERN.matcher(siteKey).matches()) {
            throw new IllegalArgumentException("Invalid site key: " + siteKey);
        }

        try {
            JCRSessionWrapper session = JCRSessionFactory.getInstance()
                    .getCurrentUserSession("default");

            // Extract the path portion from the URL
            String path = extractPath(url);

            // Clean the path once — used by both resolution strategies
            String cleanPath = cleanUrlPath(path, siteKey);

            // 1. Try vanity URL lookup
            GqlJcrNode vanityResult = findByVanityUrl(cleanPath, siteKey, session);
            if (vanityResult != null) {
                return vanityResult;
            }

            // 2. Fallback: try direct JCR path resolution under /sites/{siteKey}
            return findByDirectPath(cleanPath, siteKey, session);
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
     * Strips common Jahia URL prefixes to extract the meaningful content path.
     * Handles /cms/render/live|default/xx, /sites/{siteKey}, language prefixes, and
     * .html suffix.
     */
    private static String cleanUrlPath(String path, String siteKey) {
        // Remove /cms/render/live|default/xx prefix
        path = path.replaceFirst("^/cms/render/(live|default)/[a-z]{2}", "");

        // Remove /sites/{siteKey} prefix
        String sitePrefix = "/sites/" + siteKey;
        if (path.startsWith(sitePrefix)) {
            path = path.substring(sitePrefix.length());
        }

        // Remove language prefix /xx/
        if (path.matches("^/[a-z]{2}(/.*)?$")) {
            path = path.substring(3);
        }

        // Remove .html suffix
        if (path.endsWith(".html")) {
            path = path.substring(0, path.length() - 5);
        }

        return path.isEmpty() ? "/" : path;
    }

    /**
     * Attempts to find a node via vanity URL matching.
     */
    private static GqlJcrNode findByVanityUrl(String cleanPath, String siteKey, JCRSessionWrapper session)
            throws RepositoryException {
        VanityUrlService vanityUrlService = BundleUtils.getOsgiService(VanityUrlService.class, null);
        if (vanityUrlService == null) {
            return null;
        }

        List<VanityUrl> urls = vanityUrlService.findExistingVanityUrls(
                cleanPath, siteKey, session.getWorkspace().getName());

        for (VanityUrl vanityUrl : urls) {
            if (vanityUrl.isActive()) {
                try {
                    String nodePath = StringUtils.substringBefore(vanityUrl.getPath(), VANITY_MAPPINGS_SEGMENT);
                    JCRNodeWrapper targetNode = session.getNode(nodePath);
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
    private static GqlJcrNode findByDirectPath(String cleanPath, String siteKey, JCRSessionWrapper session) {
        String siteRoot = "/sites/" + siteKey;

        // If path already starts with /sites/, use it directly
        if (cleanPath.startsWith("/sites/")) {
            return tryResolveNode(cleanPath, session);
        }

        String[] candidates = new String[] {
                siteRoot + cleanPath,
                siteRoot + "/home" + cleanPath
        };

        for (String candidate : candidates) {
            GqlJcrNode result = tryResolveNode(candidate, session);
            if (result != null) {
                return result;
            }
        }

        return null;
    }

    /**
     * Tries to resolve a single JCR path, returning null on failure.
     */
    private static GqlJcrNode tryResolveNode(String path, JCRSessionWrapper session) {
        try {
            if (session.nodeExists(path)) {
                return new GqlJcrNodeImpl(session.getNode(path));
            }
        } catch (RepositoryException ignored) {
            // Node not found at this path
        }
        return null;
    }
}
