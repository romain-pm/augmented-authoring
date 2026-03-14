import { Header, LayoutContent, Paper } from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import { SearchPanel } from "./SearchPanel.tsx";

export const AdminPanel = () => {
  const { t } = useTranslation();

  return (
    <LayoutContent
      header={
        <Header
          title={t("search.panelTitle", "Search anything")}
          mainActions={[
            <span key="build-time" style={{ fontSize: "14px", color: "#16a34a", fontWeight: 700, alignSelf: "center" }}>
              {t("search.builtAt", "Built: {{time}}", { time: new Date(__BUILD_TIME__).toLocaleString() })}
            </span>,
          ]}
        />
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content={(<Paper><SearchPanel /></Paper>) as any}
    />
  );
};