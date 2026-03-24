<%@ page language="java" contentType="text/javascript" import="java.util.Date" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<% String buildTime = new Date().toString(); %>
<c:set var="kfindConfig" value="${functions:getConfigValues('org.jahia.pm.modules.kfind')}"/>
<c:choose>
    <c:when test="${! empty kfindConfig}">
        contextJsParameters.kfind={buildTime:"<%= buildTime %>",
            minSearchChars:${kfindConfig['minSearchChars']},
            defaultDisplayedResults:${kfindConfig['defaultDisplayedResults']},
            augmentedFindDelayInTypingToLaunchSearch:${kfindConfig['augmentedFindDelayInTypingToLaunchSearch']},
            jcrFindDelayInTypingToLaunchSearch:${kfindConfig['jcrFindDelayInTypingToLaunchSearch']},
            uiFeaturesEnabled:${kfindConfig['uiFeaturesEnabled']},
            uiFeaturesMaxResults:${kfindConfig['uiFeaturesMaxResults']},
            jcrMediaEnabled:${kfindConfig['jcrMediaEnabled']},
            jcrMediaMaxResults:${kfindConfig['jcrMediaMaxResults']},
            jcrPagesEnabled:${kfindConfig['jcrPagesEnabled']},
            jcrPagesMaxResults:${kfindConfig['jcrPagesMaxResults']},
            jcrMainResourcesEnabled:${kfindConfig['jcrMainResourcesEnabled']},
            jcrMainResourcesMaxResults:${kfindConfig['jcrMainResourcesMaxResults']},
            urlReverseLookupEnabled:${kfindConfig['urlReverseLookupEnabled']}
        }
        console.debug("%c kfind config is added to contextJsParameters", "color: #3c8cba");
    </c:when>
    <c:otherwise>
        <utility:logger level="warn" value="kfind configuration is not available"/>
        console.warn("kfind configuration is not available");
    </c:otherwise>
</c:choose>
