package org.jahia.pm.modules.kfind.graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

import java.util.Arrays;
import java.util.Collection;

@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class KFindGraphQLExtensionProvider implements DXGraphQLExtensionsProvider {

    @Override
    public Collection<Class<?>> getExtensions() {
        return Arrays.asList(KFindQueryExtensions.class);
    }
}
