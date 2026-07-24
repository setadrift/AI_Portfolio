const navItems = ["Overview", "Financial", "Appointments", "Team", "Client retention", "Client funnel"];

export default function TtgDashboardLoading() {
  return (
    <div className="ttg-dashboard-shell ttg-dashboard-loading" aria-busy="true">
      <aside className="ttg-dashboard-nav" aria-hidden="true">
        <div>
          <div className="ttg-loading-line is-short" />
          <div className="ttg-loading-line is-medium" />
        </div>
        <nav>
          {navItems.map((item) => <span className="ttg-loading-nav-item" key={item} />)}
        </nav>
      </aside>
      <div className="ttg-dashboard-main" role="status" aria-live="polite">
        <span className="sr-only">Loading dashboard</span>
        <div className="ttg-loading-line is-short" />
        <div className="ttg-loading-line is-title" />
        <div className="ttg-loading-line is-wide" />
        <div className="ttg-loading-cards" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => <div key={item}><span /><strong /><small /></div>)}
        </div>
        <div className="ttg-loading-panels" aria-hidden="true">
          <div />
          <div />
        </div>
      </div>
    </div>
  );
}
