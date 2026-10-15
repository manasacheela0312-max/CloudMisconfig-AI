export default function StatCard({
  title,
  value,
  icon,
  color = "blue"
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        {icon}
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}