<%@ page language="java" contentType="text/javascript" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>

<c:set var="kfindConfig" value="${functions:getConfigValues('org.jahia.pm.modules.kfind')}"/>
<c:choose>
    <c:when test="${! empty kfindConfig}">
        contextJsParameters.kFind={
            typeOfJCRGraphQL:"${kfindConfig['typeOfJCRGraphQL']}",
            minSearchChars:${kfindConfig['minSearchChars']},
            defaultDisplayedResults:${kfindConfig['defaultDisplayedResults']},
            augmentedFindDelayInTypingToLaunchSearch:${kfindConfig['augmentedFindDelayInTypingToLaunchSearch']},
            jcrFindDelayInTypingToLaunchSearch:${kfindConfig['jcrFindDelayInTypingToLaunchSearch']}
        }
        console.debug("%c kFind config is added to contextJsParameters", "color: #3c8cba");
    </c:when>
    <c:otherwise>
        <utility:logger level="warn" value="kFind configuration is not available"/>
        console.warn("kFind configuration is not available");
    </c:otherwise>
</c:choose>
