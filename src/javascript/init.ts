/**
 * Entry point for the kFind Jahia module.
 *
 * Registers a callback with @jahia/ui-extender that fires at app init.
 * The callback loads i18n, mounts the search modal, and adds the primary
 * nav button.
 *
 * @see registerRoutes in routes.tsx for the actual bootstrap logic.
 */
import { registry } from "@jahia/ui-extender";
import { registerRoutes } from "./kfind/routes.tsx";

export default function () {
  registry.add("callback", "kFind", {
    targets: ["jahiaApp-init:2"],
    requireModuleInstalledOnSite: "kfind",
    callback: registerRoutes,
  });
}
