import Icon, { type OmsIconName } from "../../_components/Icon";

type Props = {
  icon?: OmsIconName;
  title: string;
  description?: string;
};

export default function PageSoon({
  icon = "clock",
  title,
  description = "Ta funkcja wkrótce będzie dostępna.",
}: Props) {
  return (
    <div className="page-soon">
      <div className="page-soon-icon" aria-hidden="true">
        <Icon name={icon} size={28} />
      </div>
      <h2 className="page-soon-title">{title}</h2>
      <p className="page-soon-desc">{description}</p>
      <span className="page-soon-tag">w przygotowaniu</span>
    </div>
  );
}
