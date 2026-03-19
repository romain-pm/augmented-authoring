import { registry } from "@jahia/ui-extender";
import { registerRoutes } from "./kFind/routes.tsx";

export default function () {
  registry.add("callback", "kFind", {
    targets: ["jahiaApp-init:2"],
    requireModuleInstalledOnSite: "kFind",
    callback: registerRoutes,
  });
}
