import PageSoon from "../_components/PageSoon";

export const metadata = {
  title: "Ustawienia · Budomex OMS",
};

export default function SettingsPage() {
  return (
    <>
      <header className="content-header">
        <div>
          <div className="content-crumb">OMS · Ustawienia</div>
          <h1 className="content-title">Ustawienia</h1>
          <p className="content-sub">
            Konfiguracja konta, uprawnień i parametrów systemu.
          </p>
        </div>
      </header>

      <PageSoon
        icon="settings"
        title="Ustawienia wkrótce dostępne"
        description="Tu skonfigurujesz dane firmy, role pracowników, szablony zadań i integracje."
      />
    </>
  );
}
