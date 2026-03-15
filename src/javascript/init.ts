import { registry } from "@jahia/ui-extender";
import { registerRoutes } from "./AdminPanel/routes.tsx";

export default function () {
  registry.add("callback", "augmented-authoring", {
    targets: ["jahiaApp-init:2"],
    requireModuleInstalledOnSite: "augmented-authoring",
    callback: registerRoutes,
  });
}
