import type { Metadata } from "next";
import OmsShell from "./_components/OmsShell";
import "./oms.css";

export const metadata: Metadata = {
  title: "Budomex OMS",
};

// Motyw jest powiązany z kontem (per username), nie globalnie z przeglądarką —
// inaczej ciemny tryb managera "przeciekał" na pracownika logującego się na tym
// samym urządzeniu. Czytamy zalogowanego usera z localStorage i jego motyw.
const themeInitScript = `
try {
  var t = 'light';
  var raw = localStorage.getItem('bdx-oms-user');
  if (raw) {
    var u = JSON.parse(raw);
    if (u && u.username) {
      var saved = localStorage.getItem('bdx-oms-theme:' + u.username);
      if (saved === 'dark' || saved === 'light') t = saved;
    }
  }
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function OmsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: themeInitScript }}
      />
      <OmsShell>{children}</OmsShell>
    </>
  );
}
