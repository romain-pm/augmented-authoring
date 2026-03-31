---
name: jahia-graphql-extension
description: "Use when adding a custom GraphQL field to the Jahia DXGraphQL API from a Java OSGi module. Covers @GraphQLTypeExtension, @GraphQLField, DXGraphQLExtensionsProvider OSGi registration, pom.xml dependencies, and security requirements for JCR access."
---

# Jahia GraphQL Extension — Java Side

## When to Use

Load this skill when you need to expose a new GraphQL field from Java in a Jahia OSGi module.

> **Check the schema first.** Before creating a new extension, verify that no existing Jahia GraphQL field already satisfies the requirement. Open the GraphQL playground at `/modules/graphql` on your Jahia instance, or inspect the `graphql-schema.json` introspection artifact in the project. Only build a custom extension when no Jahia equivalent exists.

---

## Two Required Classes

Every GraphQL extension requires exactly two Java classes.

### 1. Extension class — `@GraphQLTypeExtension`

This class adds new fields to an existing GraphQL type (usually `Query`):

```java
package org.jahia.[org].[module].graphql;

import graphql.annotations.annotationTypes.*;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;

@GraphQLTypeExtension(DXGraphQLProvider.Query.class)
@GraphQLDescription("My module GraphQL extension")
public class MyQueryExtensions {

    @GraphQLField
    @GraphQLName("myField")
    @GraphQLDescription("Returns something useful given a siteKey")
    public static MyReturnType myField(
            @GraphQLNonNull @GraphQLName("siteKey") @GraphQLDescription("The site key") String siteKey,
            @GraphQLName("optionalParam") @GraphQLDescription("Optional parameter") String optionalParam) {

        // implementation
        return new MyReturnType(...);
    }
}
```

- Methods **must be `static`**.
- Use `@GraphQLNonNull` for required arguments.
- Each argument needs both `@GraphQLName` (the GraphQL argument name) and `@GraphQLDescription`.

### 2. OSGi provider — `DXGraphQLExtensionsProvider`

Registers the extension class with the Jahia GraphQL runtime:

```java
package org.jahia.[org].[module].graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;
import java.util.Arrays;
import java.util.Collection;

@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class MyGraphQLExtensionProvider implements DXGraphQLExtensionsProvider {

    @Override
    public Collection<Class<?>> getExtensions() {
        return Arrays.asList(MyQueryExtensions.class);
    }
}
```

- `@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)` — the OSGi annotation is required for Jahia to discover the provider at bundle startup.
- List all extension classes in `getExtensions()`.

---

## `pom.xml` Dependencies

Add both dependencies with `<scope>provided</scope>` — they are supplied by the Jahia runtime and must not be bundled:

```xml
<dependency>
    <groupId>org.jahia.modules</groupId>
    <artifactId>graphql-dxm-provider</artifactId>
    <version>3.6.0</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>com.graphql-java-kickstart</groupId>
    <artifactId>graphql-java-annotations</artifactId>
    <version>9.1</version>
    <scope>provided</scope>
</dependency>
```

Match the versions to those declared in your Jahia parent BOM. Check the BOM's `dependencyManagement` section if uncertain.

---

## Security Requirements

### Input Validation

Validate all input parameters before using them in JCR paths or queries. Attackers can inject path traversal sequences or special characters:

```java
private static final Pattern SITE_KEY_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]+$");

if (!SITE_KEY_PATTERN.matcher(siteKey).matches()) {
    throw new IllegalArgumentException("Invalid site key: " + siteKey);
}
```

Validate any parameter that is concatenated into a JCR path (e.g. `siteKey`, `nodeName`, `workspace`).

### JCR Session

Always use the **current user's session** — it inherits the user's JCR access permissions automatically:

```java
// ✅ correct — current user's permissions apply
JCRSessionWrapper session = JCRSessionFactory.getInstance()
        .getCurrentUserSession("default");

// ❌ wrong — bypasses access control
JCRSessionFactory.getInstance().getCurrentSystemSession("default", null, null);
```

Never use system or admin sessions in GraphQL extensions that accept user-supplied parameters.

---

## Return Types

For returning JCR nodes, use `GqlJcrNode` / `GqlJcrNodeImpl` from `graphql-dxm-provider` — they are already wired into the Jahia GraphQL schema with all standard JCR node fields:

```java
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNode;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNodeImpl;

// Wrap a JCRNodeWrapper as a GraphQL-compatible node
GqlJcrNode gqlNode = new GqlJcrNodeImpl(jcrNodeWrapper, "default");
```

For custom return types, create a plain Java class and annotate it with `@GraphQLObjectType` and `@GraphQLField` on getters.

---

## Logging

Use SLF4J at `DEBUG` level for operational logging — GraphQL extensions run on every query call:

```java
private static final Logger logger = LoggerFactory.getLogger(MyQueryExtensions.class);

logger.debug("[myField] called with siteKey='{}' param='{}'", siteKey, optionalParam);
```

Avoid `INFO`-level logging inside query methods — it will spam the Jahia log on every search keystroke.
