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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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

    private static final Logger logger = LoggerFactory.getLogger(KFindQueryExtensions.class);

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
        logger.debug("[urlReverseLookup] START — url='{}' siteKey='{}'", url, siteKey);

        if (!SITE_KEY_PATTERN.matcher(siteKey).matches()) {
            logger.debug("[urlReverseLookup] Rejected — siteKey '{}' fails validation pattern", siteKey);
            throw new IllegalArgumentException("Invalid site key: " + siteKey);
        }

        try {
            JCRSessionWrapper session = JCRSessionFactory.getInstance()
                    .getCurrentUserSession("default");

            // Extract the path portion from the URL
            String path = extractPath(url);
            logger.debug("[urlReverseLookup] extractPath('{}') => '{}'", url, path);

            // Clean the path once — used by both resolution strategies
            String cleanPath = cleanUrlPath(path, siteKey);
            logger.debug("[urlReverseLookup] cleanUrlPath('{}', '{}') => '{}'", path, siteKey, cleanPath);

            // 1. Try vanity URL lookup
            logger.debug("[urlReverseLookup] Trying vanity URL lookup for cleanPath='{}'", cleanPath);
            GqlJcrNode vanityResult = findByVanityUrl(cleanPath, siteKey, session);
            if (vanityResult != null) {
                logger.debug("[urlReverseLookup] Resolved via vanity URL — returning node");
                return vanityResult;
            }
            logger.debug("[urlReverseLookup] No vanity URL match, falling back to direct path resolution");

            // 2. Fallback: try direct JCR path resolution under /sites/{siteKey}
            GqlJcrNode directResult = findByDirectPath(cleanPath, siteKey, session);
            if (directResult != null) {
                logger.debug("[urlReverseLookup] Resolved via direct path — returning node");
            } else {
                logger.debug("[urlReverseLookup] END — no node found for url='{}' cleanPath='{}'", url, cleanPath);
            }
            return directResult;
        } catch (RepositoryException e) {
            logger.debug("[urlReverseLookup] RepositoryException for url='{}': {}", url, e.getMessage(), e);
            throw new RuntimeException("Error during URL reverse lookup: " + e.getMessage(), e);
        }
    }

    /**
     * Extracts the path from a URL string. Handles both full URLs and plain paths.
     */
    private static String extractPath(String url) {
        logger.debug("[extractPath] input='{}'", url);

        if (url == null || url.isEmpty()) {
            logger.debug("[extractPath] input is null or empty — returning '/'");
            return "/";
        }

        try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                logger.debug("[extractPath] detected full URL scheme, parsing with URI");
                URI uri = URI.create(url);
                logger.debug("[extractPath] URI parsed — scheme='{}' host='{}' path='{}' query='{}' fragment='{}'",
                        uri.getScheme(), uri.getHost(), uri.getPath(), uri.getQuery(), uri.getFragment());
                String path = uri.getPath();
                if (path == null || path.isEmpty()) {
                    logger.debug("[extractPath] URI path is null/empty — returning '/'");
                    return "/";
                }
                logger.debug("[extractPath] extracted path from full URL: '{}'", path);
                return path;
            }
        } catch (IllegalArgumentException e) {
            // Not a valid URI — treat as a path
            logger.debug("[extractPath] URI.create failed for '{}' — treating as plain path: {}", url, e.getMessage());
        }

        String result = url.startsWith("/") ? url : "/" + url;
        logger.debug("[extractPath] treating as plain path — result='{}'", result);
        return result;
    }

    /**
     * Strips common Jahia URL prefixes to extract the meaningful content path.
     * Handles /cms/render/live|default/xx, /sites/{siteKey}, language prefixes, and
     * .html suffix.
     */
    private static String cleanUrlPath(String path, String siteKey) {
        logger.debug("[cleanUrlPath] START — path='{}' siteKey='{}'", path, siteKey);
        String original = path;

        // Remove /cms/render/live|default/xx prefix
        path = path.replaceFirst("^/cms/render/(live|default)/[a-z]{2}", "");
        if (!path.equals(original)) {
            logger.debug("[cleanUrlPath] stripped /cms/render prefix: '{}' => '{}'", original, path);
        } else {
            logger.debug("[cleanUrlPath] no /cms/render prefix found in '{}'", path);
        }

        // Remove /sites/{siteKey} prefix
        String sitePrefix = "/sites/" + siteKey;
        String beforeSite = path;
        if (path.startsWith(sitePrefix)) {
            path = path.substring(sitePrefix.length());
            logger.debug("[cleanUrlPath] stripped /sites/{} prefix: '{}' => '{}'", siteKey, beforeSite, path);
        } else {
            logger.debug("[cleanUrlPath] no /sites/{} prefix found — path stays '{}'", siteKey, path);
        }

        // Remove language prefix /xx/
        String beforeLang = path;
        if (path.matches("^/[a-z]{2}(/.*)?$")) {
            path = path.substring(3);
            logger.debug("[cleanUrlPath] stripped language prefix: '{}' => '{}'", beforeLang, path);
        } else {
            logger.debug("[cleanUrlPath] no language prefix matched in '{}'", path);
        }

        // Remove .html suffix
        String beforeHtml = path;
        if (path.endsWith(".html")) {
            path = path.substring(0, path.length() - 5);
            logger.debug("[cleanUrlPath] stripped .html suffix: '{}' => '{}'", beforeHtml, path);
        } else {
            logger.debug("[cleanUrlPath] no .html suffix in '{}'", path);
        }

        String result = path.isEmpty() ? "/" : path;
        if (path.isEmpty()) {
            logger.debug("[cleanUrlPath] path became empty after stripping — using '/'");
        }
        logger.debug("[cleanUrlPath] END — '{}' => '{}'", original, result);
        return result;
    }

    /**
     * Attempts to find a node via vanity URL matching.
     */
    private static GqlJcrNode findByVanityUrl(String cleanPath, String siteKey, JCRSessionWrapper session)
            throws RepositoryException {
        logger.debug("[findByVanityUrl] cleanPath='{}' siteKey='{}' workspace='{}'",
                cleanPath, siteKey, session.getWorkspace().getName());

        VanityUrlService vanityUrlService = BundleUtils.getOsgiService(VanityUrlService.class, null);
        if (vanityUrlService == null) {
            logger.debug("[findByVanityUrl] VanityUrlService OSGi service unavailable — skipping vanity lookup");
            return null;
        }

        List<VanityUrl> urls = vanityUrlService.findExistingVanityUrls(
                cleanPath, siteKey, session.getWorkspace().getName());
        logger.debug("[findByVanityUrl] found {} vanity URL candidate(s) for path '{}'", urls.size(), cleanPath);

        for (VanityUrl vanityUrl : urls) {
            logger.debug("[findByVanityUrl] candidate: path='{}' active={} url='{}' language='{}'",
                    vanityUrl.getPath(), vanityUrl.isActive(), vanityUrl.getUrl(), vanityUrl.getLanguage());
            if (vanityUrl.isActive()) {
                try {
                    String nodePath = StringUtils.substringBefore(vanityUrl.getPath(), VANITY_MAPPINGS_SEGMENT);
                    logger.debug("[findByVanityUrl] extracted node path from vanity entry: '{}' => '{}'",
                            vanityUrl.getPath(), nodePath);
                    JCRNodeWrapper targetNode = session.getNode(nodePath);
                    logger.debug("[findByVanityUrl] resolved node at '{}'", targetNode.getPath());
                    return new GqlJcrNodeImpl(targetNode);
                } catch (RepositoryException e) {
                    // Keep lookup resilient while exposing enough detail for debugging broken vanity mappings.
                    logger.debug("Skipping broken vanity URL entry for path '{}'", vanityUrl.getPath(), e);
                }
            } else {
                logger.debug("[findByVanityUrl] skipping inactive candidate: '{}'", vanityUrl.getPath());
            }
        }

        logger.debug("[findByVanityUrl] no active vanity URL resolved for '{}'", cleanPath);
        return null;
    }

    /**
     * Attempts to resolve the URL path as a direct JCR node path.
     */
    private static GqlJcrNode findByDirectPath(String cleanPath, String siteKey, JCRSessionWrapper session) {
        logger.debug("[findByDirectPath] cleanPath='{}' siteKey='{}'", cleanPath, siteKey);
        String siteRoot = "/sites/" + siteKey;

        // If path already starts with /sites/, use it directly
        if (cleanPath.startsWith("/sites/")) {
            logger.debug("[findByDirectPath] path already starts with /sites/ — resolving directly: '{}'", cleanPath);
            return tryResolveNode(cleanPath, session);
        }

        String[] candidates = new String[] {
                siteRoot + cleanPath,
                siteRoot + "/home" + cleanPath
        };

        logger.debug("[findByDirectPath] will try {} candidate path(s): {}", candidates.length, java.util.Arrays.toString(candidates));

        for (String candidate : candidates) {
            logger.debug("[findByDirectPath] trying candidate: '{}'", candidate);
            GqlJcrNode result = tryResolveNode(candidate, session);
            if (result != null) {
                logger.debug("[findByDirectPath] resolved at candidate: '{}'", candidate);
                return result;
            }
            logger.debug("[findByDirectPath] candidate not found: '{}'", candidate);
        }

        logger.debug("[findByDirectPath] all candidates exhausted — no node found for '{}'", cleanPath);
        return null;
    }

    /**
     * Tries to resolve a single JCR path, returning null on failure.
     */
    private static GqlJcrNode tryResolveNode(String path, JCRSessionWrapper session) {
        logger.debug("[tryResolveNode] checking path: '{}'", path);
        try {
            boolean exists = session.nodeExists(path);
            logger.debug("[tryResolveNode] nodeExists('{}') = {}", path, exists);
            if (exists) {
                JCRNodeWrapper node = session.getNode(path);
                logger.debug("[tryResolveNode] successfully loaded node — path='{}' type='{}'",
                        node.getPath(), node.getPrimaryNodeType().getName());
                return new GqlJcrNodeImpl(node);
            }
        } catch (RepositoryException e) {
            // Node may not exist in this workspace/variant; log at debug to aid diagnostics without noisy logs.
            logger.debug("Unable to resolve node at path '{}'", path, e);
        }
        logger.debug("[tryResolveNode] returning null for path: '{}'", path);
        return null;
    }
}
