import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowDownUp, ArrowRight, Bell, Building2,
  CalendarDays, ChefHat, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList,
  Clock3, CreditCard, Download, LayoutDashboard, LogOut, Menu, Package, Search,
  Settings2, Sparkles, UserRound, Users, X
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { api, today } from './api.js';
import Landing from './Landing.jsx';
import { Login, Signup } from './AuthPages.jsx';
import { hasOrganizationModule, organizationProfile } from './organizationTypes.js';

const AuthContext = createContext(null);
const ToastContext = createContext(() => {});
const useAuth = () => useContext(AuthContext);
const useToast = () => useContext(ToastContext);
const organizationTypeLabel = (type) => organizationProfile(type).label;

function ToastHost({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`} role="status">{toast.type === 'error' ? <AlertTriangle size={17} /> : <Sparkles size={17} />}{toast.message}</div>;
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingState />;
  return user ? children : <Navigate to="/login" replace />;
}

function OrganizationRoute({ children, moduleName }) {
  const { user } = useAuth();
  return hasOrganizationModule(user?.organizationType, moduleName)
    ? children
    : <Navigate to="/dashboard" replace />;
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lowStock, setLowStock] = useState(0);
  const profile = organizationProfile(user?.organizationType);
  const icons = {
    users: Users,
    menu: ChefHat,
    attendance: ClipboardList,
    inventory: Package,
    predictions: Sparkles,
    billing: CreditCard,
    reports: Activity,
    orders: ClipboardList,
    sales: Activity,
    events: ClipboardList,
    calendar: CalendarDays
  };
  const operations = profile.navigation.filter(([module]) => !['calendar', 'predictions', 'billing', 'reports'].includes(module));
  const intelligence = profile.navigation.filter(([module]) => ['calendar', 'predictions', 'billing', 'reports'].includes(module));
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { section: 'OPERATIONS' },
    ...operations.map(([module, to, label, icon]) => ({
      to, label, icon: icons[icon], badge: module === 'inventory'
    })),
    { section: 'PLANNING & INSIGHTS' },
    ...intelligence.map(([module, to, label, icon]) => ({
      to, label, icon: icons[icon], highlight: module === 'predictions'
    })),
    { to: '/profile', label: 'Profile', icon: Settings2 }
  ];
  const pageTitle = navItems.find((item) => item.to === location.pathname)?.label || 'Dashboard';
  useEffect(() => { api('/analytics/dashboard').then((data) => setLowStock(data.lowStock)).catch(() => {}); }, [location.pathname]);
  function searchSubmit(event) {
    event.preventDefault();
    if (query.trim()) navigate(`/${profile.primaryResource}?search=${encodeURIComponent(query.trim())}`);
  }
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark"><ChefHat size={19} /></span>
        {!collapsed && <span className="brand-word">opti<span>meal</span><b>AI</b></span>}
        <button className="collapse-button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
      </div>
      <div className="workspace-switch"><span className="workspace-avatar">{user?.organizationName?.slice(0, 1) || 'O'}</span>{!collapsed && <><span><b>{user?.organizationName || 'Your organization'}</b><small>Food operations</small></span><ChevronDown size={15} /></>}</div>
      <nav className="side-nav">
        {navItems.map((item, index) => item.section
          ? (!collapsed && <div className="nav-section" key={item.section}>{item.section}</div>)
          : <NavLink key={item.to} to={item.to} end={item.end} title={item.label} aria-label={item.label} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${item.highlight ? 'nav-highlight' : ''}`}>
            <item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.badge && lowStock > 0 && !collapsed && <i className="nav-count">{lowStock}</i>}
          </NavLink>)}
      </nav>
      <div className="sidebar-bottom">
        {!collapsed && <div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><b>Need a hand?</b><p>Visit the quick-start guide for tips.</p><a href="mailto:support@optimeal.local">Get support <ChevronRight size={13} /></a></div>}
        <button className="nav-link" onClick={() => logout()} title={collapsed ? 'Sign out' : undefined}><LogOut size={18} /><span>Sign out</span></button>
        <div className="sidebar-user"><div className="user-avatar">{user?.name?.slice(0, 1) || 'A'}</div>{!collapsed && <><span><b>{user?.name}</b><small>{user?.role} account</small></span><Settings2 size={16} className="user-settings" /></>}</div>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{pageTitle}</b></div>
        <div className="topbar-actions">
          <form className="global-search" onSubmit={searchSubmit}><Search size={16} /><input placeholder={`Search ${profile.primaryLabel.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} /></form>
          <button className="icon-button notification-button" aria-label={lowStock ? `${lowStock} low stock alerts` : 'Notifications'} onClick={() => lowStock && navigate('/inventory')}><Bell size={18} />{lowStock > 0 && <span className="notification-dot" />}</button>
          <div className="topbar-date"><span className="today-label">TODAY</span><b>{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date())}</b></div>
          <div className="profile-menu-wrap">
            <button className="profile-trigger" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
              <span className="user-avatar">{user?.name?.slice(0, 1) || <UserRound size={17} />}</span><ChevronDown size={14} />
            </button>
            {profileOpen && <div className="profile-dropdown">
              <div className="profile-dropdown-user"><b>{user?.name}</b><span>{user?.email}</span></div>
              <div className="profile-dropdown-org"><Building2 size={15} /><span><b>{user?.organizationName}</b><small>{organizationTypeLabel(user?.organizationType)}</small></span></div>
              <button onClick={() => { setProfileOpen(false); navigate('/profile'); }}><Settings2 size={15} />Profile Settings</button>
              <button className="profile-logout" onClick={logout}><LogOut size={15} />Logout</button>
            </div>}
          </div>
        </div>
      </header>
      <div className="page-content">{children}</div>
      <footer className="app-footer"><span>© 2026 OptiMeal AI</span><span>Less waste. More good. <span className="footer-heart">✦</span></span></footer>
    </main>
  </div>;
}

const chartTooltip = { contentStyle: { borderRadius: 12, border: '1px solid #eee8f8', boxShadow: '0 8px 25px #30234a14', fontSize: 12 } };
const number = (value) => Number(value || 0).toLocaleString();
const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const profile = organizationProfile(user.organizationType);
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('week');
  const [calendarPreview, setCalendarPreview] = useState(null);
  useEffect(() => { api('/analytics/dashboard').then(setData).catch((err) => setError(err.message)); }, []);
  useEffect(() => {
    if (!data?.calendar?.date) return;
    api(`/predictions/preview?date=${data.calendar.date}`)
      .then(setCalendarPreview)
      .catch(() => setCalendarPreview(null));
  }, [data?.calendar?.date]);
  useEffect(() => {
    api(`/analytics/reports?period=${period}`).then((report) => (report.chart || report.attendance || []).map((row) => ({
      ...row,
      day: new Date(`${row.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short', ...(period === 'month' ? { day: 'numeric' } : {}) })
    }))).then(setChartData).catch((err) => setError(err.message));
  }, [period]);
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (!data) return <LoadingState />;
  const statIcons = [Users, Activity, ChefHat, ClipboardList, ArrowDownRight, CreditCard, Package];
  const statTones = ['lavender', 'peach', 'blue', 'lavender', 'rose', 'blue', 'lavender'];
  const stats = profile.stats.map(([label, key, format], index) => ({
    label,
    value: format === 'currency' ? currency(data[key]) : format === 'percent' ? `${number(data[key])}%` : number(data[key]),
    icon: statIcons[index % statIcons.length],
    tone: statTones[index % statTones.length],
    change: key === 'wastePercent'
      ? `${number(data.wasteMeals)} portions · 30 days`
      : key.toLowerCase().includes('today') ? 'Today' : 'Organization total'
  }));
  const hasMealStats = hasOrganizationModule(user.organizationType, 'attendance');
  const colors = ['#8064d8', '#b6a1ee'];
  return <div className="page-stack">
    <div className="welcome-row">
      <div><span className="eyebrow">{organizationTypeLabel(user.organizationType).toUpperCase()} DASHBOARD</span><h1>Good morning, {user.name.split(' ')[0]} <span className="wave">✦</span></h1><p>Here’s the story your kitchen data is telling today.</p></div>
      <div className="welcome-actions"><button className="button secondary" onClick={() => window.print()}><Download size={16} /> Export overview</button><button className="button primary" onClick={() => navigate('/predictions')}><Sparkles size={16} /> Run a prediction</button></div>
    </div>
    <div className="stats-grid">{stats.map(({ label, value, icon: Icon, tone, change, trend }) => <article className="stat-card" key={label}>
      <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} /></span></div>
      <div className="stat-value">{value}</div><div className={`stat-caption ${trend ? 'positive' : ''}`}>{trend && <ArrowDownRight size={14} />}{change}</div>
    </article>)}</div>
    <div className="dashboard-grid">
      <section className="panel trend-panel" style={!hasMealStats ? { gridColumn: '1 / -1' } : undefined}>
        <div className="panel-heading"><div><h2>{profile.chartTitle}</h2><p>{profile.chartDescription}</p></div><div className="select-wrap"><select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="week">This week</option><option value="month">This month</option></select><ChevronDown size={14} /></div></div>
        <div className="chart-legend">{profile.chartSeries.map(([, label], index) => <span key={label}><i className={`legend-dot ${index ? 'lilac-dot' : 'purple-dot'}`} /> {label}</span>)}<span className="chart-units">{profile.chartUnit}</span></div>
        <div className="chart-box">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 6, bottom: 0, left: -18 }}>
          <defs>{colors.map((color, index) => <linearGradient key={color} id={`seriesFill${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.2} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient>)}</defs>
          <CartesianGrid vertical={false} stroke="#f0edf5" strokeDasharray="3 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9690a5', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9690a5', fontSize: 11 }} /><Tooltip {...chartTooltip} />{profile.chartSeries.map(([key, label], index) => <Area key={key} type="monotone" dataKey={key} name={label} stroke={colors[index % colors.length]} strokeWidth={2.5} fill={`url(#seriesFill${index % colors.length})`} />)}
        </AreaChart></ResponsiveContainer> : <ChartEmpty />}</div>
      </section>
      {hasMealStats && <section className="panel meal-panel">
        <div className="panel-heading"><div><h2>By mealtime</h2><p>Last 30 days · portions served</p></div><button className="text-button" onClick={() => navigate('/reports')}>View report <ChevronRight size={14} /></button></div>
        {data.mealStats.length ? <div className="meal-list">{['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => {
          const entry = data.mealStats.find((item) => item.meal === meal);
          const consumed = Number(entry?.consumed || 0);
          const prepared = Number(entry?.prepared || 0);
          const ratio = prepared ? Math.round(consumed / prepared * 100) : 0;
          return <div className="meal-row" key={meal}><span className={`meal-emoji ${meal}`}>{meal === 'breakfast' ? '☼' : meal === 'lunch' ? '◒' : meal === 'dinner' ? '◐' : '✧'}</span><div className="meal-details"><div className="meal-title"><b>{meal[0].toUpperCase() + meal.slice(1)}</b><span>{number(consumed)} <small>portions</small></span></div><div className="progress-track"><span style={{ width: `${ratio}%` }} /></div></div><span className="meal-percent">{ratio}%</span></div>;
        })}</div> : <EmptyState title="No meal data yet" text="Add attendance records to see your service mix." />}
        <div className="meal-total"><span><i className="legend-dot purple-dot" /> Consumed</span><strong>{number(data.mealStats.reduce((sum, item) => sum + Number(item.consumed), 0))} <small>portions</small></strong></div>
      </section>}
    </div>
    <div className="bottom-grid">
      <section className="insight-banner"><div className="insight-spark"><Sparkles size={20} /></div><div className="insight-content"><span className="eyebrow">A LITTLE INSIGHT</span><h3>{data.latestPrediction?.insight || 'Your kitchen, one step ahead.'}</h3><p>{data.latestPrediction ? `Latest forecast · ${data.latestPrediction.meal_type} · ${data.latestPrediction.target_date}` : 'Run a forecast to see a tailored preparation recommendation.'}</p></div><button className="insight-link" onClick={() => navigate('/predictions')}>Explore insight <ChevronRight size={16} /></button></section>
      <section className={`stock-alert ${data.lowStock ? 'has-alert' : ''}`}><span className="stock-icon"><Package size={18} /></span><div><b>{data.lowStock ? `${data.lowStock} low-stock ${data.lowStock === 1 ? 'ingredient' : 'ingredients'}` : data.inventory ? 'Stock levels look good' : 'No inventory tracked yet'}</b><p>{data.lowStock ? 'A quick restock could keep service running smoothly.' : data.inventory ? 'Your pantry is above its minimum levels.' : 'Add ingredients to start monitoring stock.'}</p></div><button className="icon-button" onClick={() => navigate('/inventory')} aria-label="View inventory"><ChevronRight size={17} /></button></section>
    </div>
    <section className="panel dashboard-calendar">
      <div className="panel-heading"><div><div className="page-kicker"><CalendarDays size={14} /> CALENDAR & DEMAND</div><h2>{data.calendar.dayName}, {new Date(`${data.calendar.date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</h2><p>Events, confirmed operating status and demand planning for your organization.</p></div><button className="button secondary" onClick={() => navigate('/calendar')}>View Calendar <ChevronRight size={14} /></button></div>
      <div className="dashboard-calendar-grid">
        <div className="dashboard-calendar-column"><span className="calendar-summary-label">TODAY</span>
          {data.calendar.todayEvents.filter((event) => event.eventType !== 'weekend').length
            ? data.calendar.todayEvents.filter((event) => event.eventType !== 'weekend').map((event) => <div className="calendar-summary-event" key={event.id}><i className={`event-dot ${event.eventType}`} /><span><b>{event.name}</b><small>{displayLabel(event.eventType)}{event.isOpen === null ? ' · closure not confirmed' : event.isOpen ? ' · open' : ' · closed'}</small></span></div>)
            : <p className="calendar-summary-empty">No holiday or organization event today.</p>}
          <div className="calendar-open-status">{data.calendar.todayEvents.some((event) => event.source === 'organization')
            ? data.calendar.todayEvents.some((event) => event.source === 'organization' && !event.isOpen) ? 'Organization marked closed' : 'Organization marked open'
            : 'Operating status not confirmed'}</div>
        </div>
        <div className="dashboard-calendar-column"><span className="calendar-summary-label">EXPECTED DINERS · TODAY</span>
          {calendarPreview?.meals?.some((meal) => ['trained', 'estimate', 'closed'].includes(meal.status))
            ? <><b className="calendar-summary-number">{number(calendarPreview.meals.filter((meal) => ['trained', 'estimate', 'closed'].includes(meal.status)).reduce((sum, meal) => sum + meal.predictedDiners, 0))}</b><p className="calendar-summary-empty">Recommended preparation: {number(calendarPreview.meals.reduce((sum, meal) => sum + (meal.recommendedQuantity || 0), 0))} portions</p></>
            : <><b className="calendar-summary-number">—</b><p className="calendar-summary-empty">Add meal history or expected event attendance for a forecast.</p></>}
          <button className="text-button" onClick={() => navigate(`/predictions?date=${data.calendar.date}`)}>View demand prediction <ChevronRight size={14} /></button>
        </div>
        <div className="dashboard-calendar-column"><span className="calendar-summary-label">UPCOMING HOLIDAYS & EVENTS</span>
          {[...data.calendar.upcomingHolidays, ...data.calendar.upcomingSpecialEvents].slice(0, 4).length
            ? [...data.calendar.upcomingHolidays, ...data.calendar.upcomingSpecialEvents].slice(0, 4).map((event) => <div className="calendar-summary-event" key={`${event.date}-${event.id}`}><i className={`event-dot ${event.eventType}`} /><span><b>{event.name}</b><small>{new Date(`${event.date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · {displayLabel(event.eventType)}</small></span></div>)
            : <p className="calendar-summary-empty">No upcoming holidays or special events are on the calendar.</p>}
        </div>
      </div>
    </section>
    <div className="dashboard-utility-grid">
      <section className="panel quick-actions-panel">
        <div className="panel-heading"><div><h2>Quick actions</h2><p>Get to your daily tools in one step.</p></div></div>
        <div className="quick-actions">
          {profile.quickActions.map(([label, to], index) => {
            const Icon = [ChefHat, ClipboardList, Package, CreditCard][index % 4];
            return <button key={to} onClick={() => navigate(to)}><span><Icon size={17} /></span><b>{label}</b><ArrowRight size={14} /></button>;
          })}
        </div>
      </section>
      <section className="panel recent-activity-panel">
        <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates from your organization.</p></div><Clock3 size={16} /></div>
        {data.recentActivity?.length ? <div className="recent-activity-list">{data.recentActivity.map((item, index) => <div className="activity-item" key={`${item.type}-${item.occurredAt}-${index}`}><span className="activity-mark"><Activity size={14} /></span><div><b>{item.description}</b><small>{item.type} · {new Date(item.occurredAt).toLocaleString()}</small></div></div>)}</div> : <EmptyState title="No activity yet" text="Updates will appear here as you add records." />}
      </section>
    </div>
  </div>;
}

const field = (name, label, type = 'text', options = {}) => ({ name, label, type, ...options });
const definitions = {
  students: { title: 'Students', description: 'A thoughtful view of the people you serve.', singular: 'student', icon: Users, fields: [field('student_code', 'Student ID'), field('name', 'Full name'), field('department', 'Department'), field('year_level', 'Year', 'number', { min: 1, max: 8 }), field('contact', 'Contact number', 'tel', { optional: true })], columns: ['student_code', 'name', 'department', 'year_level', 'contact'], searchable: 'Name, student ID or department', label: 'Campus directory' },
  customers: { title: 'Customer Management', description: 'Manage customer records and keep service details together.', singular: 'customer', icon: Users, fields: [field('name', 'Customer name'), field('reference', 'Customer reference', 'text', { optional: true }), field('contact', 'Contact details', 'text', { optional: true }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['name', 'reference', 'contact', 'bill_count', 'last_purchase'], searchable: 'Search customer name or contact', label: 'Customer directory' },
  employees: { title: 'Employee Management', description: 'Keep employee and meal-service information organized.', singular: 'employee', icon: Users, fields: [field('name', 'Employee name'), field('reference', 'Employee ID', 'text', { optional: true }), field('department', 'Department', 'text', { optional: true }), field('contact', 'Contact details', 'text', { optional: true }), field('status', 'Status', 'select', { options: ['active', 'inactive'], optional: true }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['name', 'reference', 'department', 'contact', 'status'], searchable: 'Search employee name or department', label: 'Employee directory' },
  residents: { title: 'Hostel Residents', description: 'Manage residents and room assignments for the mess.', singular: 'resident', icon: Users, fields: [field('name', 'Resident name'), field('reference', 'Student ID', 'text', { optional: true }), field('room', 'Room', 'text', { optional: true }), field('contact', 'Contact details', 'text', { optional: true }), field('status', 'Status', 'select', { options: ['active', 'inactive'], optional: true }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['name', 'reference', 'room', 'contact', 'status'], searchable: 'Search resident, ID or room', label: 'Resident directory' },
  clients: { title: 'Client Management', description: 'Organize client contacts for your catering service.', singular: 'client', icon: Users, fields: [field('name', 'Client name'), field('reference', 'Client reference', 'text', { optional: true }), field('contact', 'Contact details', 'text', { optional: true }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['name', 'reference', 'contact', 'notes'], searchable: 'Search client name or contact', label: 'Client directory' },
  hospital_contacts: { title: 'Staff / Customer Management', description: 'Keep staff and canteen customer details organized.', singular: 'staff / customer record', icon: Users, fields: [field('name', 'Name'), field('reference', 'Reference', 'text', { optional: true }), field('department', 'Department', 'text', { optional: true }), field('contact', 'Contact details', 'text', { optional: true }), field('status', 'Status', 'select', { options: ['active', 'inactive'], optional: true }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['name', 'reference', 'department', 'contact', 'status'], searchable: 'Search name or department', label: 'Staff / customer directory' },
  events: { title: 'Event Management', description: 'Plan guest counts, menus and food preparation for each event.', singular: 'event', icon: ClipboardList, fields: [field('name', 'Event name'), field('event_date', 'Event date', 'date'), field('meal_type', 'Meal service', 'select', { options: ['breakfast', 'lunch', 'dinner', 'snacks'], optional: true }), field('guest_count', 'Guest count', 'number', { min: 0 }), field('venue', 'Venue', 'text', { optional: true }), field('status', 'Status', 'select', { options: ['planned', 'confirmed', 'completed', 'cancelled'], optional: true }), field('menu_plan', 'Menu plan', 'textarea', { optional: true }), field('preparation_plan', 'Preparation plan', 'textarea', { optional: true }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['name', 'event_date', 'meal_type', 'guest_count', 'venue', 'status'], searchable: 'Search event or venue', label: 'Event schedule' },
  menu: { title: 'Menu management', description: 'Keep each day’s menu fresh, clear and easy to plan.', singular: 'menu item', icon: ChefHat, fields: [field('item_name', 'Item name'), field('meal_type', 'Meal', 'select', { options: ['breakfast', 'lunch', 'dinner', 'snacks'] }), field('menu_date', 'Menu date', 'date'), field('quantity', 'Available portions', 'number', { min: 0 }), field('price', 'Price (₹)', 'number', { min: 0, step: '0.01' })], columns: ['item_name', 'meal_type', 'menu_date', 'quantity', 'price'], searchable: 'Search menu items', label: 'Your daily menu' },
  attendance: { title: 'Attendance', description: 'Capture the rhythm of each meal, day by day.', singular: 'attendance record', icon: ClipboardList, fields: [field('attendance_date', 'Meal date', 'date'), field('meal_type', 'Meal', 'select', { options: ['breakfast', 'lunch', 'dinner', 'snacks'] }), field('expected_diners', 'Expected diners', 'number', { min: 0 }), field('actual_diners', 'Actual diners', 'number', { min: 0 }), field('meals_prepared', 'Meals prepared', 'number', { min: 0 }), field('notes', 'Notes', 'textarea', { optional: true })], columns: ['attendance_date', 'meal_type', 'expected_diners', 'actual_diners', 'meals_prepared'], searchable: 'Search by meal or notes', label: 'Attendance history' },
  inventory: { title: 'Food inventory', description: 'Know what’s in your pantry before the next prep.', singular: 'ingredient', icon: Package, fields: [field('ingredient_name', 'Ingredient name'), field('quantity', 'Available quantity', 'number', { min: 0, step: '0.01' }), field('unit', 'Unit (kg, L, pcs…)'), field('min_stock', 'Minimum stock level', 'number', { min: 0, step: '0.01' })], columns: ['ingredient_name', 'quantity', 'unit', 'min_stock'], searchable: 'Search ingredients', label: 'Pantry overview' }
};

function RegistrationsPanel() {
  const { user } = useAuth();
  const toast = useToast();
  const personConfig = {
    college_mess: { type: 'student', resource: 'students', label: 'Student', title: 'Student meal registrations' },
    hostel_mess: { type: 'resident', resource: 'residents', label: 'Resident', title: 'Resident meal registrations' },
    corporate_cafeteria: { type: 'employee', resource: 'employees', label: 'Employee', title: 'Employee meal registrations' }
  }[user.organizationType];
  const [people, setPeople] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [form, setForm] = useState({ personId: '', mealDate: today(), mealType: 'lunch', notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() {
    const [peopleData, registrationData] = await Promise.all([
      api(`/records/${personConfig.resource}`),
      api(`/records/registrations?date=${encodeURIComponent(form.mealDate)}`)
    ]);
    setPeople(peopleData);
    setRegistrations(registrationData);
  }
  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [personConfig.resource, form.mealDate]);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/records/registrations', {
        method: 'POST',
        body: JSON.stringify({ ...form, personType: personConfig.type })
      });
      await load();
      toast(`${personConfig.label} meal registration saved.`);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }
  async function updateStatus(registration, status) {
    try {
      await api(`/records/registrations/${registration.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: registration.notes })
      });
      await load();
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    }
  }
  async function remove(registration) {
    if (!window.confirm(`Delete the meal registration for ${registration.attendee_name}?`)) return;
    try {
      await api(`/records/registrations/${registration.id}`, { method: 'DELETE' });
      await load();
      toast('Meal registration deleted.');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    }
  }
  return <section className="panel table-panel">
    <div className="table-toolbar"><div><h2>{personConfig.title}</h2><p>{registrations.length} registrations for {form.mealDate}</p></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    <form className="forecast-form" onSubmit={save}>
      <label>{personConfig.label}<span className="select-control"><select required value={form.personId} onChange={(event) => setForm({ ...form, personId: event.target.value })}><option value="">Select a {personConfig.label.toLowerCase()}</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name}{person.student_code ? ` · ${person.student_code}` : person.reference ? ` · ${person.reference}` : ''}</option>)}</select><ChevronDown size={14} /></span></label>
      <label>Meal date<input type="date" required value={form.mealDate} onChange={(event) => setForm({ ...form, mealDate: event.target.value })} /></label>
      <label>Meal service<span className="select-control"><select required value={form.mealType} onChange={(event) => setForm({ ...form, mealType: event.target.value })}>{['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => <option key={meal}>{meal}</option>)}</select><ChevronDown size={14} /></span></label>
      <button className="button primary" disabled={saving || !people.length}>{saving ? <span className="spinner" /> : 'Register meal'}</button>
    </form>
    {registrations.length ? <div className="table-scroll"><table><thead><tr><th>{personConfig.label}</th><th>Meal date</th><th>Meal</th><th>Status</th>{['owner', 'manager'].includes(user.role) && <th>Actions</th>}</tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id}><td>{registration.attendee_name}</td><td>{registration.meal_date}</td><td><span className="meal-badge">{registration.meal_type}</span></td><td><select aria-label={`Registration status for ${registration.attendee_name}`} value={registration.status} onChange={(event) => updateStatus(registration, event.target.value)}>{['registered', 'served', 'absent'].map((status) => <option key={status} value={status}>{status}</option>)}</select></td>{['owner', 'manager'].includes(user.role) && <td><button className="danger-link" onClick={() => remove(registration)}>Delete</button></td>}</tr>)}</tbody></table></div>
      : <EmptyState title="No meal registrations for this date" text={people.length ? 'Register a person above to start tracking meal consumption.' : `Add a ${personConfig.label.toLowerCase()} record before registering meals.`} />}
  </section>;
}

function displayLabel(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function recordValue(record, key, resource) {
  if (key === 'meal_type') return <span className="meal-badge">{record[key]}</span>;
  if (key === 'price') return currency(record[key]);
  if (key === 'quantity' && resource === 'inventory') return `${record[key]} ${record.unit}`;
  if (key === 'year_level') return `Year ${record[key]}`;
  if (key === 'bill_count') return number(record[key]);
  if (key === 'last_purchase') return record[key] ? new Date(record[key]).toLocaleDateString() : <span className="muted">—</span>;
  return record[key] ?? <span className="muted">—</span>;
}

function RecordsPage({ resource }) {
  const { user } = useAuth();
  const profile = organizationProfile(user.organizationType);
  const navigationItem = profile.navigation.find(([module]) => module === resource);
  const config = resource === 'attendance'
    ? {
      ...definitions.attendance,
      title: navigationItem?.[2] || definitions.attendance.title,
      label: navigationItem?.[2] || definitions.attendance.label,
      singular: user.organizationType === 'corporate_cafeteria' ? 'meal registration record' : 'meal record',
      description: user.organizationType === 'corporate_cafeteria'
        ? 'Track expected employee attendance, meal registrations and meals served.'
        : 'Record expected diners, meal consumption and preparation for each service.'
    }
    : resource === 'menu'
      ? { ...definitions.menu, title: navigationItem?.[2] || definitions.menu.title }
    : definitions[resource];
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState(new URLSearchParams(window.location.search).get('search') || '');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterMeal, setFilterMeal] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [sort, setSort] = useState({ key: '', direction: 'asc' });
  const toast = useToast();
  async function load() {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterMeal) params.set('meal_type', filterMeal);
      setRecords(await api(`/records/${resource}?${params}`));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [resource, search, filterMeal]);
  function beginEdit(record = null) {
    setEditing(record?.id ?? 'new');
    const next = {};
    for (const item of config.fields) next[item.name] = record?.[item.name] ?? (item.type === 'date' ? today() : '');
    setForm(next);
  }
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try {
      const path = `/records/${resource}${editing === 'new' ? '' : `/${editing}`}`;
      await api(path, { method: editing === 'new' ? 'POST' : 'PUT', body: JSON.stringify(form) });
      setEditing(null); await load(); toast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${editing === 'new' ? 'added' : 'updated'} successfully.`);
    } catch (err) { setError(err.message); toast(err.message, 'error'); } finally { setSaving(false); }
  }
  async function remove(record) {
    if (!window.confirm(`Delete this ${config.singular}? This action cannot be undone.`)) return;
    try { await api(`/records/${resource}/${record.id}`, { method: 'DELETE' }); await load(); toast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted.`); }
    catch (err) { setError(err.message); toast(err.message, 'error'); }
  }
  const Icon = config.icon;
  const visibleRecords = records
    .filter((record) => !filterDepartment || record.department === filterDepartment)
    .sort((left, right) => {
      if (!sort.key) return 0;
      const a = left[sort.key];
      const b = right[sort.key];
      const comparison = !Number.isNaN(Number(a)) && !Number.isNaN(Number(b))
        ? Number(a) - Number(b)
        : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  function changeSort(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><Icon size={14} /> {config.label}</div><h1>{config.title}</h1><p>{config.description}</p></div><button className="button primary" onClick={() => beginEdit()}><span className="plus">+</span> Add {config.singular}</button></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
    <section className="panel table-panel">
      <div className="table-toolbar"><div><h2>{config.label}</h2><p>{records.length} {records.length === 1 ? 'record' : 'records'}</p></div><div className="table-tools">
        <label className="table-search"><Search size={16} /><input placeholder={config.searchable} value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>/</kbd></label>
        {resource === 'students' && <label className="meal-filter"><select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}><option value="">All departments</option>{[...new Set(records.map((record) => record.department))].sort().map((department) => <option key={department}>{department}</option>)}</select><ChevronDown size={14} /></label>}
        {resource === 'attendance' && <label className="meal-filter"><select value={filterMeal} onChange={(e) => setFilterMeal(e.target.value)}><option value="">All meals</option>{['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => <option key={meal}>{meal}</option>)}</select><ChevronDown size={14} /></label>}
        <button className="icon-button border-button" title="Refresh" onClick={load}><Activity size={16} /></button>
      </div></div>
        {loading ? <LoadingState compact /> : visibleRecords.length ? <div className="table-scroll"><table><thead><tr>{config.columns.map((key) => <th key={key}><button className="sort-button" onClick={() => changeSort(key)}>{displayLabel(key)}<ArrowDownUp size={11} /></button></th>)}<th className="actions-heading">Actions</th></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.id ?? `${record.name}-${record.source}`}>{config.columns.map((key) => <td key={key}>{recordValue(record, key, resource)}</td>)}<td>{record.source === 'bill_history' ? <span className="muted">Billing history</span> : <div className="row-actions"><button onClick={() => beginEdit(record)}>Edit</button>{['owner', 'manager'].includes(user.role) && <button className="danger-link" onClick={() => remove(record)}>Delete</button>}</div>}</td></tr>)}</tbody></table></div> : <EmptyState title="Nothing here just yet" text={`Add your first ${config.singular} to get this space started.`} action={<button className="button secondary" onClick={() => beginEdit()}>Add {config.singular}</button>} />}
    </section>
    {resource === 'attendance' && hasOrganizationModule(user.organizationType, 'registrations') && <RegistrationsPanel />}
    {editing !== null && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}><form className="modal-card" onSubmit={save}>
      <div className="modal-head"><div><span className="form-kicker">{editing === 'new' ? 'NEW RECORD' : 'EDIT RECORD'}</span><h2>{editing === 'new' ? `Add ${config.singular}` : `Edit ${config.singular}`}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setEditing(null)}><X size={18} /></button></div>
      <div className="form-grid">{config.fields.map((item) => <label key={item.name} className={item.type === 'textarea' ? 'span-two' : ''}>{item.label}{item.type === 'select' ? <span className="select-control"><select required={!item.optional} value={form[item.name]} onChange={(e) => setForm({ ...form, [item.name]: e.target.value })}><option value="">{item.placeholder || 'Select an option'}</option>{item.options.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select><ChevronDown size={14} /></span> : item.type === 'textarea' ? <textarea rows="3" value={form[item.name]} onChange={(e) => setForm({ ...form, [item.name]: e.target.value })} /> : <input required={!item.optional} type={item.type} min={item.min} max={item.max} step={item.step} value={form[item.name]} onChange={(e) => setForm({ ...form, [item.name]: e.target.value })} />}</label>)}</div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button primary" disabled={saving}>{saving ? <span className="spinner" /> : editing === 'new' ? 'Add record' : 'Save changes'}</button></div>
    </form></div>}
  </div>;
}

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/auth/profile')
      .then((profile) => {
        updateUser(profile);
        setForm({
          name: profile.name,
          email: profile.email,
          userId: profile.userId,
          organizationName: profile.organizationName
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const profile = await api('/auth/profile', { method: 'PUT', body: JSON.stringify(form) });
      updateUser(profile);
      setForm({
        name: profile.name,
        email: profile.email,
        userId: profile.userId,
        organizationName: profile.organizationName
      });
      toast('Profile changes saved.');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><UserRound size={14} /> ACCOUNT</div><h1>Profile Settings</h1><p>Manage your account and organization details.</p></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
    {loading || !form ? <LoadingState /> : <form className="panel profile-form" onSubmit={save}>
      <div className="profile-summary"><div className="profile-large-avatar">{user?.name?.slice(0, 1) || <UserRound size={25} />}</div><div><h2>{user?.name}</h2><p>{user?.email}</p></div></div>
      <div className="profile-fields">
        <label>Full name<input required maxLength="120" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Email address<input required type="email" maxLength="190" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>User ID<input required minLength="3" maxLength="40" pattern="[A-Za-z0-9._\\x2D]{3,40}" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} /></label>
        <label>Organization name<input required maxLength="140" autoComplete="organization" value={form.organizationName} onChange={(event) => setForm({ ...form, organizationName: event.target.value })} /></label>
        <label>Organization type<input value={organizationTypeLabel(user?.organizationType)} readOnly /></label>
        <label>Account role<input value={user?.role || ''} readOnly /></label>
      </div>
      <div className="profile-form-actions"><span>Your organization type is fixed for this workspace.</span><button className="button primary" disabled={saving}>{saving ? <span className="spinner" /> : 'Save changes'}</button></div>
    </form>}
  </div>;
}

function Predictions() {
  const { user } = useAuth();
  const location = useLocation();
  const profile = organizationProfile(user.organizationType);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const requestedDate = new URLSearchParams(location.search).get('date');
  const [form, setForm] = useState(() => ({ date: requestedDate || today(), mealType: 'lunch' }));
  const [calendarPreview, setCalendarPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  async function load() {
    try { setHistory(await api('/predictions')); } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (requestedDate) setForm((current) => ({ ...current, date: requestedDate }));
  }, [requestedDate]);
  useEffect(() => {
    let active = true;
    setCalendarPreview(null);
    setPreviewError('');
    api(`/predictions/preview?date=${encodeURIComponent(form.date)}`)
      .then((preview) => { if (active) setCalendarPreview(preview); })
      .catch((err) => { if (active) setPreviewError(err.message); });
    return () => { active = false; };
  }, [form.date]);
  async function run(event) {
    event.preventDefault(); setLoading(true); setError(''); setResult(null);
    try {
      const prediction = await api('/predictions', { method: 'POST', body: JSON.stringify(form) });
      setResult(prediction); await load();
      toast(prediction.status === 'trained' ? 'Calendar-aware forecast created from your demand history.' : 'Calendar-based estimate saved.');
    } catch (err) { setError(err.message); toast(err.message, 'error'); } finally { setLoading(false); }
  }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><Sparkles size={14} /> DECISION SUPPORT</div><h1>{profile.navigation.find(([module]) => module === 'predictions')?.[2] || 'AI demand prediction'}</h1><p>Calendar-aware demand planning from your organization’s historical records and confirmed events.</p></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}<button onClick={() => setError('')}><X size={15} /></button></div>}
    <div className="prediction-layout">
      <section className="panel forecast-panel"><div className="panel-heading"><div><h2>Forecast a meal</h2><p>Historical demand, weekday, weekend and confirmed calendar features.</p></div><span className="model-chip"><span /> CALENDAR-AWARE</span></div>
        <form className="forecast-form" onSubmit={run}><label>Prediction date<input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Meal service<span className="select-control"><select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })}>{['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => <option key={meal} value={meal}>{meal[0].toUpperCase() + meal.slice(1)}</option>)}</select><ChevronDown size={14} /></span></label><button className="button primary" disabled={loading}>{loading ? <span className="spinner" /> : <><Sparkles size={16} /> Generate forecast</>}</button></form>
        <div className="model-note"><Activity size={15} /><span>Trained forecasts require at least five historical records for this meal. With less history, the system only provides a clearly labeled event estimate when you entered expected attendance. It never invents accuracy or demand data.</span></div>
        <div className="calendar-feature-strip">
          <div className="panel-heading"><div><h3>Date-wise meal outlook</h3><p>{form.date}</p></div></div>
          {previewError ? <p className="calendar-summary-empty">{previewError}</p> : !calendarPreview ? <LoadingState compact /> : <div className="calendar-predictions-list">
            {calendarPreview.meals.map((meal) => <div className="calendar-prediction-item" key={meal.mealType}>
              <span className="meal-badge">{meal.mealType}</span>
              {meal.status === 'insufficient_data'
                ? <span className="prediction-empty">{meal.message}</span>
                : <><b>{number(meal.predictedDiners)} diners</b><span>{number(meal.recommendedQuantity)} prep</span><small className={`forecast-status ${meal.status}`}>{meal.status === 'trained' ? `Calendar-aware model · ${meal.normalWorkingDayAverage === null ? 'no normal-day baseline' : `${number(meal.normalWorkingDayAverage)} normal-day average`}` : meal.status === 'estimate' ? 'Event estimate · not trained AI' : 'Organization closed'}</small></>}
            </div>)}
          </div>}
        </div>
      </section>
      {result ? <section className="prediction-result"><div className="result-top"><span className="result-spark"><Sparkles size={17} /></span><span>{result.status === 'trained' ? 'TRAINED FORECAST' : result.status === 'estimate' ? 'BASIC EVENT ESTIMATE' : 'CLOSURE NOTICE'}</span><b>{result.targetDate}</b></div><div className="result-main"><strong>{number(result.predictedDiners)}</strong><span>{user.organizationType === 'catering_service' ? 'expected guests' : 'expected diners'}</span></div><div className="result-metrics"><div><span>Recommended prep</span><b>{number(result.recommendedQuantity)} <small>portions</small></b></div><div><span>Preparation buffer</span><b>{number(result.estimatedSurplus)} <small>portions</small></b></div>{result.possibleShortage !== null && <div><span>Menu shortage</span><b>{number(result.possibleShortage)} <small>portions</small></b></div>}</div><p className="result-insight"><Sparkles size={14} />{result.insight}</p><small className="source-note">{result.status === 'trained' ? `Calendar-aware regression · ${result.trainingRecords} ${result.dataSource}.` : result.modelName}</small></section>
        : <section className="prediction-placeholder"><div className="placeholder-art"><div><Activity size={29} /></div><span className="dot dot-a" /><span className="dot dot-b" /><span className="dot dot-c" /></div><h3>Your next service, in focus.</h3><p>Add at least five past attendance records for a meal before generating a meaningful forecast from your own data.</p></section>}
    </div>
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Forecast history</h2><p>Your recent demand forecasts</p></div><span className="history-count">{history.length} forecasts</span></div>{history.length ? <div className="table-scroll"><table><thead><tr><th>For date</th><th>Meal</th><th>Predicted diners</th><th>Recommended prep</th><th>Est. buffer</th><th>Model</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{item.target_date}</td><td><span className="meal-badge">{item.meal_type}</span></td><td><b>{number(item.predicted_diners)}</b></td><td>{number(item.recommended_quantity)} portions</td><td>{number(item.estimated_surplus)} portions</td><td><span className="model-name">{item.model_name}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No forecasts generated" text="Your predictions will appear here once you run your first forecast." />}</section>
  </div>;
}

function shiftDate(date, days) {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function calendarViewRange(anchor, view) {
  const selected = new Date(`${anchor}T00:00:00Z`);
  if (view === 'day') return { start: anchor, end: anchor, dates: [anchor] };
  if (view === 'week') {
    const start = shiftDate(anchor, -((selected.getUTCDay() + 6) % 7));
    const dates = Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
    return { start, end: dates[6], dates };
  }
  const first = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const last = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const start = shiftDate(first, -((new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7));
  const end = shiftDate(last, (7 - new Date(`${last}T00:00:00Z`).getUTCDay()) % 7);
  const count = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1;
  return { start, end, dates: Array.from({ length: count }, (_, index) => shiftDate(start, index)) };
}

function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [anchor, setAnchor] = useState(today());
  const [view, setView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(today());
  const [calendar, setCalendar] = useState(null);
  const [stateCode, setStateCode] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const range = calendarViewRange(anchor, view);
  const daysByDate = new Map((calendar?.days || []).map((day) => [day.date, day]));
  const selectedDay = daysByDate.get(selectedDate);
  const canManageState = ['owner', 'manager'].includes(user.role);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`/calendar?from=${range.start}&to=${range.end}`)
      .then((data) => {
        if (!active) return;
        setCalendar(data);
        setStateCode(data.stateCode || '');
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range.start, range.end, refresh]);

  useEffect(() => {
    let active = true;
    setPreview(null);
    setPreviewError('');
    api(`/predictions/preview?date=${encodeURIComponent(selectedDate)}`)
      .then((data) => { if (active) setPreview(data); })
      .catch((err) => { if (active) setPreviewError(err.message); });
    return () => { active = false; };
  }, [selectedDate, refresh]);

  function movePeriod(direction) {
    const selected = new Date(`${anchor}T00:00:00Z`);
    if (view === 'month') selected.setUTCMonth(selected.getUTCMonth() + direction);
    else selected.setUTCDate(selected.getUTCDate() + direction * (view === 'week' ? 7 : 1));
    const next = selected.toISOString().slice(0, 10);
    setAnchor(next);
  }

  function beginEvent(event = null, defaults = {}) {
    setEditing(event?.source === 'organization' ? event.id : 'new');
    setForm({
      date: event?.date || defaults.date || selectedDate,
      name: event?.name || defaults.name || '',
      description: event?.description || '',
      eventType: event?.eventType || defaults.eventType || 'special_event',
      isOpen: event?.isOpen ?? defaults.isOpen ?? true,
      expectedCount: event?.expectedCount ?? '',
      mealType: event?.mealType || ''
    });
  }

  async function saveEvent(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const path = `/calendar/events${editing === 'new' ? '' : `/${editing}`}`;
      await api(path, {
        method: editing === 'new' ? 'POST' : 'PUT',
        body: JSON.stringify({ ...form, expectedCount: form.expectedCount === '' ? null : Number(form.expectedCount) })
      });
      setEditing(null);
      setRefresh((current) => current + 1);
      toast(`Calendar event ${editing === 'new' ? 'added' : 'updated'}.`);
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(event) {
    if (!window.confirm(`Delete "${event.name}" from the calendar?`)) return;
    try {
      await api(`/calendar/events/${event.id}`, { method: 'DELETE' });
      setRefresh((current) => current + 1);
      toast('Calendar event deleted.');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    }
  }

  async function changeState(value) {
    try {
      const saved = await api('/calendar/state', {
        method: 'PUT',
        body: JSON.stringify({ stateCode: value || null })
      });
      setStateCode(saved.stateCode || '');
      setRefresh((current) => current + 1);
      toast(saved.stateCode ? 'Regional calendar updated.' : 'Regional calendar cleared.');
    } catch (err) {
      setError(err.message);
      toast(err.message, 'error');
    }
  }

  const visibleDates = view === 'month'
    ? range.dates
    : range.dates;
  const titleDate = new Date(`${anchor}T00:00:00Z`);
  const periodTitle = view === 'month'
    ? titleDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : view === 'day'
      ? titleDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      : `${new Date(`${range.start}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(`${range.end}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  const upcoming = (calendar?.days || []).flatMap((day) => day.events
    .filter((event) => event.eventType !== 'weekend' && day.date >= selectedDate)
    .map((event) => ({ ...event, date: day.date })))
    .slice(0, 8);

  function renderDay(date) {
    const day = daysByDate.get(date);
    const dateObject = new Date(`${date}T00:00:00Z`);
    const isCurrentMonth = dateObject.getUTCMonth() === titleDate.getUTCMonth();
    const eventRows = day?.events || [];
    return <button type="button" className={`calendar-month-day ${selectedDate === date ? 'selected' : ''} ${!isCurrentMonth && view === 'month' ? 'outside-month' : ''} ${day?.isWeekend ? 'weekend-day' : ''}`} key={date} onClick={() => { setSelectedDate(date); setAnchor(date); }}>
      <span className="calendar-day-number">{dateObject.getUTCDate()}</span>
      <span className="calendar-day-events">{eventRows.slice(0, view === 'month' ? 2 : 5).map((event) => <span className={`calendar-event-chip ${event.eventType}`} key={event.id}><i className={`event-dot ${event.eventType}`} />{event.name}</span>)}
      {eventRows.length > (view === 'month' ? 2 : 5) && <small className="calendar-more-events">+{eventRows.length - (view === 'month' ? 2 : 5)} more</small>}</span>
    </button>;
  }

  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><CalendarDays size={14} /> ORGANIZATION PLANNING</div><h1>Calendar & Events</h1><p>Plan operating days, regional holidays, festivals and special events.</p></div><button className="button primary" onClick={() => beginEvent()}><span className="plus">+</span> Add event</button></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
    <div className="calendar-main-layout">
      <section className="panel calendar-panel">
        <div className="calendar-toolbar"><div className="calendar-period-controls"><button className="icon-button border-button" aria-label="Previous period" onClick={() => movePeriod(-1)}><ChevronLeft size={17} /></button><h2>{periodTitle}</h2><button className="icon-button border-button" aria-label="Next period" onClick={() => movePeriod(1)}><ChevronRight size={17} /></button><button className="text-button" onClick={() => { setAnchor(today()); setSelectedDate(today()); }}>Today</button></div>
          <div className="calendar-toolbar-actions"><label className="state-select">Indian state<span className="select-control"><select disabled={!canManageState} value={stateCode} onChange={(event) => changeState(event.target.value)}><option value="">National calendar only</option>{(calendar?.states || []).map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}</select><ChevronDown size={14} /></span></label>
            <div className="calendar-view-switch">{['month', 'week', 'day'].map((option) => <button key={option} className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option}</button>)}</div>
          </div>
        </div>
        <div className={`calendar-grid calendar-${view}`}>
          <div className="calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
          {loading ? <LoadingState /> : visibleDates.length ? <div className={view === 'month' ? 'calendar-month-grid' : `calendar-period-grid ${view}`}>{visibleDates.map(renderDay)}</div> : <EmptyState title="Calendar is unavailable" text="Try refreshing the calendar." />}
        </div>
        <div className="calendar-legend"><span><i className="event-dot holiday" />Holiday</span><span><i className="event-dot festival" />Festival</span><span><i className="event-dot weekend" />Weekend</span><span><i className="event-dot special_event" />Special event</span><span><i className="event-dot working_day" />Working day</span></div>
      </section>
      <aside className="calendar-side-column">
        <section className="panel calendar-detail-panel">
          <div className="calendar-detail-heading"><div><span className="calendar-summary-label">SELECTED DATE</span><h2>{new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</h2></div><button className="icon-button border-button" aria-label="Add event for this date" onClick={() => beginEvent(null, { date: selectedDate })}><span className="plus">+</span></button></div>
          <div className="calendar-event-list">{selectedDay?.events.length ? selectedDay.events.map((event) => <div className="calendar-event-row" key={event.id}>
            <i className={`event-dot ${event.eventType}`} /><div className="calendar-event-main"><b>{event.name}</b><small>{displayLabel(event.eventType)}{event.source === 'public' ? ` · ${event.stateCode === 'IN' ? 'India' : stateCode}` : ''}{event.isOpen === null ? '' : event.isOpen ? ' · Open' : ' · Closed'}</small>{event.description && <p>{event.description}</p>}{event.expectedCount !== null && <small>{number(event.expectedCount)} expected · {event.mealType || 'all meals'}</small>}</div>
            {event.source === 'organization' ? <div className="row-actions"><button onClick={() => beginEvent(event)}>Edit</button>{['owner', 'manager'].includes(user.role) && <button className="danger-link" onClick={() => deleteEvent(event)}>Delete</button>}</div>
              : event.source === 'public' && <button className="text-button confirm-calendar-event" onClick={() => beginEvent(null, { date: selectedDate, name: event.name, description: event.description || '', eventType: event.eventType, isOpen: false })}>Set organization closure</button>}
          </div>) : <EmptyState title="No events on this date" text="Weekends are identified automatically. Add a holiday, working day or special event when needed." />}</div>
          <div className="calendar-status-banner">{selectedDay?.isOpen === false ? 'Organization marked closed' : selectedDay?.isOpen === true ? 'Organization marked open' : 'Open / closed status is not confirmed'}</div>
          <div className="calendar-demand-preview"><div className="panel-heading"><div><h3>Calendar-based demand</h3><p>Selected date · all meals</p></div><Sparkles size={16} /></div>
            {previewError ? <p className="calendar-summary-empty">{previewError}</p> : !preview ? <LoadingState compact /> : <div className="calendar-predictions-list">{preview.meals.map((meal) => <div className="calendar-prediction-item" key={meal.mealType}><span className="meal-badge">{meal.mealType}</span>{meal.status === 'insufficient_data' ? <span className="prediction-empty">Add records or expected event count</span> : <><b>{number(meal.predictedDiners)} diners</b><span>{number(meal.recommendedQuantity)} prep</span><small className={`forecast-status ${meal.status}`}>{meal.status === 'trained' ? meal.normalWorkingDayAverage === null ? 'No normal-day baseline' : `${number(meal.normalWorkingDayAverage)} normal-day average` : meal.status === 'estimate' ? 'Event estimate · not trained AI' : 'Closed'}</small></>}</div>)}</div>}
            <button className="button secondary wide" onClick={() => navigate(`/predictions?date=${selectedDate}`)}>Open date prediction <ChevronRight size={14} /></button>
          </div>
        </section>
        <section className="panel calendar-upcoming-panel"><div className="panel-heading"><div><h2>Upcoming</h2><p>Holidays and organization events</p></div></div>{upcoming.length ? <div className="calendar-upcoming-list">{upcoming.map((event) => <div className="calendar-upcoming-item" key={`${event.date}-${event.id}`}><span className="upcoming-date">{new Date(`${event.date}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span><i className={`event-dot ${event.eventType}`} /><span><b>{event.name}</b><small>{displayLabel(event.eventType)}</small></span></div>)}</div> : <p className="calendar-summary-empty">No upcoming events in this view.</p>}</section>
      </aside>
    </div>
    {editing !== null && form && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><form className="modal-card" onSubmit={saveEvent}>
      <div className="modal-head"><div><span className="form-kicker">{editing === 'new' ? 'CALENDAR EVENT' : 'EDIT CALENDAR EVENT'}</span><h2>{editing === 'new' ? 'Add an event' : 'Edit event'}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setEditing(null)}><X size={18} /></button></div>
      <div className="form-grid calendar-modal-fields">
        <label>Event name<input required maxLength="120" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Date<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Event type<span className="select-control"><select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value, isOpen: event.target.value === 'working_day' ? true : form.isOpen })}>{[['holiday', 'Holiday'], ['festival', 'Festival'], ['weekend', 'Weekend'], ['special_event', 'Special Event'], ['working_day', 'Working Day']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} /></span></label>
        <label>Organization status<span className="select-control"><select required value={form.isOpen ? 'open' : 'closed'} onChange={(event) => setForm({ ...form, isOpen: event.target.value === 'open' })}><option value="open">Open / working</option><option value="closed">Closed</option></select><ChevronDown size={14} /></span></label>
        <label>Expected attendance / guests<input type="number" min="0" max="1000000" value={form.expectedCount} onChange={(event) => setForm({ ...form, expectedCount: event.target.value })} /></label>
        <label>Applies to meal<span className="select-control"><select value={form.mealType} onChange={(event) => setForm({ ...form, mealType: event.target.value })}><option value="">All meals / not specified</option>{['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => <option key={meal} value={meal}>{displayLabel(meal)}</option>)}</select><ChevronDown size={14} /></span></label>
        <label className="span-two">Description<textarea rows="3" maxLength="1000" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      </div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button primary" disabled={saving}>{saving ? <span className="spinner" /> : editing === 'new' ? 'Add event' : 'Save changes'}</button></div>
    </form></div>}
  </div>;
}

function Billing() {
  const { user } = useAuth();
  const profile = organizationProfile(user.organizationType);
  const studentModule = hasOrganizationModule(user.organizationType, 'students');
  const eventModule = hasOrganizationModule(user.organizationType, 'events');
  const [menu, setMenu] = useState([]);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [bills, setBills] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState([{ menuItemId: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const toast = useToast();
  async function load() {
    try {
      const [menuData, studentData, eventData, billData] = await Promise.all([
        api(`/records/menu?date=${today()}`),
        studentModule ? api('/records/students') : Promise.resolve([]),
        eventModule ? api('/records/events') : Promise.resolve([]),
        api('/bills')
      ]);
      setMenu(menuData); setStudents(studentData); setEvents(eventData); setBills(billData);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  const total = items.reduce((sum, line) => {
    const selected = menu.find((entry) => String(entry.id) === String(line.menuItemId));
    return sum + (selected ? Number(selected.price) * Number(line.quantity || 0) : 0);
  }, 0);
  function updateItem(index, key, value) { setItems(items.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  async function selectEvent(id) {
    setEventId(id);
    const event = events.find((item) => String(item.id) === id);
    if (!event) return;
    setCustomerName(event.name);
    try { setMenu(await api(`/records/menu?date=${encodeURIComponent(event.event_date)}`)); }
    catch (err) { setError(err.message); }
  }
  async function createBill(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const saved = await api('/bills', { method: 'POST', body: JSON.stringify({ customerName, studentId: studentId || null, eventId: eventId || null, items }) });
      setInvoice(saved); setCustomerName(''); setStudentId(''); setEventId(''); setItems([{ menuItemId: '', quantity: 1 }]); await load(); toast('Bill saved successfully.');
    } catch (err) { setError(err.message); toast(err.message, 'error'); } finally { setSaving(false); }
  }
  async function viewBill(id) {
    try { setInvoice(await api(`/bills/${id}`)); } catch (err) { setError(err.message); }
  }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><CreditCard size={14} /> {profile.label.toUpperCase()} BILLING</div><h1>{eventModule ? 'Event Billing' : 'Billing & Invoices'}</h1><p>{eventModule ? 'Create event-wise invoices using your planned catering menu.' : `Record and review ${profile.label.toLowerCase()} transactions.`}</p></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}<button onClick={() => setError('')}><X size={15} /></button></div>}
    <div className="billing-layout"><form className="panel bill-form" onSubmit={createBill}>
      <div className="panel-heading"><div><h2>New bill</h2><p>Today’s menu · secure pricing from the menu</p></div><span className="bill-step">01 <span>/ 02</span></span></div>
      <label>{eventModule ? 'Client / event name' : studentModule ? 'Customer / student name' : 'Customer name'}<input required value={customerName} placeholder="Enter a name" onChange={(e) => setCustomerName(e.target.value)} /></label>
      {studentModule && <label>Student record <span className="optional-label">OPTIONAL</span><span className="select-control"><select value={studentId} onChange={(e) => { setStudentId(e.target.value); const student = students.find((item) => String(item.id) === e.target.value); if (student) setCustomerName(student.name); }}><option value="">Guest / walk-in</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.student_code}</option>)}</select><ChevronDown size={14} /></span></label>}
      {eventModule && <label>Event <span className="select-control"><select required value={eventId} onChange={(e) => selectEvent(e.target.value)}><option value="">Select a planned event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name} · {event.event_date}</option>)}</select><ChevronDown size={14} /></span></label>}
      <div className="bill-items-heading"><div><b>Items</b><span>{items.length} {items.length === 1 ? 'line' : 'lines'}</span></div><button className="text-button" type="button" onClick={() => setItems([...items, { menuItemId: '', quantity: 1 }])}>+ Add line</button></div>
      {items.map((line, index) => {
        const selected = menu.find((entry) => String(entry.id) === String(line.menuItemId));
        return <div className="bill-line" key={index}><span className="line-index">{String(index + 1).padStart(2, '0')}</span><span className="select-control line-select"><select required value={line.menuItemId} onChange={(e) => updateItem(index, 'menuItemId', e.target.value)}><option value="">Choose a menu item</option>{menu.map((item) => <option key={item.id} value={item.id}>{item.item_name} · {currency(item.price)}</option>)}</select><ChevronDown size={14} /></span><input aria-label="Quantity" className="quantity-input" type="number" min="1" max="999" required value={line.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /><b className="line-total">{currency((selected?.price || 0) * line.quantity)}</b>{items.length > 1 && <button type="button" className="remove-line" aria-label="Remove item" onClick={() => setItems(items.filter((_, i) => i !== index))}><X size={15} /></button>}</div>;
      })}
      {!menu.length && <div className="menu-empty">No menu items for today. Add today’s items in <a href="/menu">Menu management</a> first.</div>}
      <div className="bill-total"><span>Subtotal <small>Tax included where applicable</small></span><b>{currency(total)}</b></div>
      <button className="button primary wide" disabled={saving || !menu.length || !customerName.trim()}>{saving ? <span className="spinner" /> : <><CreditCard size={16} /> Save & create invoice</>}</button>
    </form>
    <aside className="billing-aside"><div className="billing-tip"><span><Sparkles size={17} /></span><div><b>Seamless by design</b><p>Pricing is taken directly from today’s menu. Every completed bill is saved with its own itemized invoice.</p></div></div>
      <div className="panel bills-panel"><div className="panel-heading"><div><h2>Recent invoices</h2><p>Latest {eventModule ? 'event' : 'customer'} transactions</p></div><span className="bills-count">{bills.length}</span></div>{bills.length ? <div className="recent-bills">{bills.slice(0, 6).map((bill) => <div className="recent-bill" key={bill.id}><div className="receipt-icon"><CreditCard size={16} /></div><div className="recent-bill-info"><b>{bill.customer_name}</b><small>{bill.bill_number} · {new Date(bill.created_at).toLocaleDateString()}</small></div><strong>{currency(bill.total)}</strong><button className="text-button" onClick={() => viewBill(bill.id)}>View</button></div>)}</div> : <EmptyState title="No invoices yet" text="Invoices will appear here after the first transaction." />}</div>
    </aside></div>
    {invoice && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setInvoice(null); }}><div className="modal-card invoice-card"><div className="modal-head no-print"><div><span className="form-kicker">INVOICE</span><h2>{invoice.bill_number || invoice.billNumber}</h2></div><button className="icon-button" onClick={() => setInvoice(null)}><X size={18} /></button></div><div className="invoice-brand"><span className="brand-mark"><ChefHat size={18} /></span><b>{user.organizationName || 'OptiMeal'}</b><span>{profile.label}</span></div><div className="invoice-meta"><div><small>BILLED TO</small><b>{invoice.customer_name || invoice.customerName}</b>{invoice.student_code && <span>{invoice.student_code}</span>}</div><div><small>DATE ISSUED</small><b>{new Date(invoice.created_at || invoice.createdAt).toLocaleString()}</b></div></div><div className="invoice-items">{(invoice.items || []).map((item, index) => <div key={index}><span>{item.item_name || item.itemName}<small>{item.quantity} × {currency(item.unit_price ?? item.unitPrice)}</small></span><b>{currency(item.line_total ?? item.lineTotal)}</b></div>)}</div><div className="invoice-total"><span>Total paid</span><b>{currency(invoice.total)}</b></div><div className="invoice-actions no-print"><button className="button secondary" onClick={() => setInvoice(null)}>Close</button><button className="button primary" onClick={() => window.print()}><Download size={15} /> Print invoice</button></div></div></div>}
  </div>;
}

function Reports() {
  const { user } = useAuth();
  const profile = organizationProfile(user.organizationType);
  const hasMealStats = hasOrganizationModule(user.organizationType, 'attendance');
  const [period, setPeriod] = useState('week');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/analytics/reports?period=${period}`).then(setReport).catch((err) => setError(err.message)); }, [period]);
  const summary = report?.summary;
  const bars = report?.chart || report?.attendance || [];
  const summaryCards = user.organizationType === 'restaurant'
    ? [['Revenue', currency(summary?.revenue), 'Recorded sales'], ['Orders', number(summary?.billCount), 'Invoices'], ['Average order', currency(summary?.averageOrder), 'Recorded invoices']]
    : user.organizationType === 'catering_service'
      ? [['Events', number(summary?.eventCount), 'Scheduled events'], ['Guests', number(summary?.eventGuests), 'Planned guest count'], ['Revenue', currency(summary?.revenue), 'Event billing']]
      : [
        ['Meals prepared', number(summary?.prepared), 'Kitchen output'],
        ['Meals consumed', number(summary?.consumed), 'Meal records'],
        ['Food waste', `${number(summary?.wasted)} portions`, `${number(summary?.wastePercent)}% of prepared`],
        ...(hasOrganizationModule(user.organizationType, 'billing')
          ? [['Billing revenue', currency(summary?.revenue), `${number(summary?.billCount)} bills`]]
          : [])
      ];
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><Activity size={14} /> INSIGHTS & IMPACT</div><h1>{profile.navigation.find(([module]) => module === 'reports')?.[2] || 'Reports'}</h1><p>Organization-scoped operational summaries.</p></div><div className="select-wrap report-period"><select value={period} onChange={(e) => setPeriod(e.target.value)}><option value="day">Today</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option></select><ChevronDown size={14} /></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    {!report ? <LoadingState /> : <>
      <div className="stats-grid report-stats">{summaryCards.map(([label, value, caption], index) => <article className="stat-card report-stat" key={label}><div className="stat-top"><span>{label}</span><span className={`report-mini-icon icon-${index}`}><Activity size={16} /></span></div><div className="stat-value">{value}</div><div className="stat-caption">{caption}</div></article>)}</div>
      <div className="dashboard-grid report-charts">
        <section className="panel trend-panel">
          <div className="panel-heading"><div><h2>{profile.chartTitle}</h2><p>{profile.chartDescription}</p></div><div className="chart-legend">{profile.chartSeries.map(([, label], index) => <span key={label}><i className={`legend-dot ${index ? 'lilac-dot' : 'purple-dot'}`} /> {label}</span>)}</div></div>
          <div className="chart-box tall-chart">{bars.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={5}><CartesianGrid vertical={false} stroke="#f0edf5" strokeDasharray="3 5" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9690a5', fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9690a5', fontSize: 11 }} /><Tooltip {...chartTooltip} />{profile.chartSeries.map(([key, label], index) => <Bar key={key} dataKey={key} name={label} fill={index ? '#c9b8f5' : '#8064d8'} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer> : <ChartEmpty />}</div>
        </section>
        {hasMealStats && <section className="panel waste-panel">
          <div className="panel-heading"><div><h2>Waste at a glance</h2><p>Prepared portions, for this period</p></div></div>
          {summary.prepared ? <>
            <div className="waste-chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: 'Consumed', value: Math.max(0, summary.consumed) }, { name: 'Wasted', value: Math.max(0, summary.wasted) }]} innerRadius={69} outerRadius={93} paddingAngle={4} dataKey="value" stroke="none">{['#8064d8', '#efeaf8'].map((color, i) => <Cell key={i} fill={color} />)}</Pie><Tooltip {...chartTooltip} /></PieChart></ResponsiveContainer><div className="donut-label"><b>{summary.wastePercent}%</b><span>waste rate</span></div></div>
            <div className="waste-legend"><span><i className="legend-dot purple-dot" /> Consumed <b>{number(summary.consumed)}</b></span><span><i className="legend-dot pale-dot" /> Estimated waste <b>{number(summary.wasted)}</b></span></div>
          </> : <ChartEmpty />}
        </section>}
      </div>
      <section className="panel table-panel"><div className="table-toolbar"><div><h2>Daily breakdown</h2><p>{hasMealStats ? 'Meal service and waste estimates by day' : profile.chartDescription}</p></div></div>{bars.length ? <div className="table-scroll"><table><thead><tr><th>Date</th>{profile.chartSeries.map(([, label]) => <th key={label}>{label}</th>)}{hasMealStats && <><th>Estimated waste</th><th>Waste rate</th></>}</tr></thead><tbody>{bars.map((row) => <tr key={row.date}><td>{new Date(`${row.date}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</td>{profile.chartSeries.map(([key]) => <td key={key}>{key === 'revenue' ? currency(row[key]) : number(row[key])}</td>)}{hasMealStats && <><td>{number(row.wasted)}</td><td><span className={Number(row.prepared) && Number(row.wasted) / Number(row.prepared) > .12 ? 'rate-high' : 'rate-low'}>{Number(row.prepared) ? (Number(row.wasted) / Number(row.prepared) * 100).toFixed(1) : '0.0'}%</span></td></>}</tr>)}</tbody></table></div> : <EmptyState title="No records in this period" text="Real operational records will appear here when available." />}</section>
    </>}
  </div>;
}

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  async function load() {
    setLoading(true);
    try { setOrders(await api('/bills/orders')); setError(''); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function updateStatus(order, status) {
    try {
      await api(`/bills/orders/${order.id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      await load();
      toast('Order status updated.');
    } catch (err) { setError(err.message); toast(err.message, 'error'); }
  }
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><ClipboardList size={14} /> RESTAURANT OPERATIONS</div><h1>Orders Management</h1><p>Track order totals and update the status of each customer order.</p></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    <section className="panel table-panel"><div className="table-toolbar"><div><h2>Restaurant orders</h2><p>{orders.length} recorded orders</p></div><button className="button primary" onClick={() => navigate('/billing')}>Create order</button></div>
      {loading ? <LoadingState compact /> : orders.length ? <div className="table-scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Created</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>{order.bill_number}</td><td>{order.customer_name}</td><td>{new Date(order.created_at).toLocaleString()}</td><td>{currency(order.total)}</td><td><select aria-label={`Order status for ${order.bill_number}`} value={order.order_status} onChange={(event) => updateStatus(order, event.target.value)}>{['pending', 'preparing', 'ready', 'completed', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div> : <EmptyState title="No orders yet" text="Create an invoice to record your first restaurant order." action={<button className="button secondary" onClick={() => navigate('/billing')}>Create an order</button>} />}
    </section>
  </div>;
}

function SalesPage() {
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('day');
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/analytics/reports?period=${period}`).then(setReport).catch((err) => setError(err.message));
  }, [period]);
  return <div className="page-stack">
    <div className="page-heading"><div><div className="page-kicker"><Activity size={14} /> RESTAURANT OPERATIONS</div><h1>Daily Sales</h1><p>Revenue and order totals from actual invoices.</p></div><div className="select-wrap report-period"><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="day">Today</option><option value="week">Last 7 days</option><option value="month">Last 30 days</option></select><ChevronDown size={14} /></div></div>
    {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
    {!report ? <LoadingState /> : <>
      <div className="stats-grid report-stats">
        <article className="stat-card report-stat"><div className="stat-top"><span>Sales</span><CreditCard size={16} /></div><div className="stat-value">{currency(report.summary.revenue)}</div><div className="stat-caption">Selected period</div></article>
        <article className="stat-card report-stat"><div className="stat-top"><span>Orders</span><ClipboardList size={16} /></div><div className="stat-value">{number(report.summary.billCount)}</div><div className="stat-caption">Recorded invoices</div></article>
      </div>
      <section className="panel table-panel"><div className="table-toolbar"><div><h2>Sales by day</h2><p>Revenue is calculated from saved bills only.</p></div></div>{report.sales?.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Orders</th><th>Sales</th></tr></thead><tbody>{report.sales.map((row) => <tr key={row.date}><td>{row.date}</td><td>{number(row.orders)}</td><td>{currency(row.revenue)}</td></tr>)}</tbody></table></div> : <EmptyState title="No sales in this period" text="Recorded order revenue will appear here." />}</section>
    </>}
  </div>;
}

function LoadingState({ compact = false }) {
  return <div className={`loading-state ${compact ? 'compact' : ''}`}><span className="spinner dark-spinner" />{!compact && <span>Gathering your kitchen’s latest…</span>}</div>;
}

function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-mark"><ChefHat size={21} /></span><h3>{title}</h3><p>{text}</p>{action}</div>;
}

function ChartEmpty() {
  return <div className="chart-empty"><span className="empty-mark"><Activity size={19} /></span><b>No data available yet.</b><span>Start adding records to see insights.</span></div>;
}

function ErrorState({ message, onRetry }) {
  return <div className="error-state"><span><AlertTriangle size={20} /></span><h2>We couldn’t load this view</h2><p>{message}</p><button className="button secondary" onClick={onRetry}>Try again</button></div>;
}

export default function App() {
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem('optimeal_token')) return null;
    try { return JSON.parse(localStorage.getItem('optimeal_user') || 'null'); } catch { return null; }
  });
  const [ready, setReady] = useState(() => !localStorage.getItem('optimeal_token'));
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  function notify(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }
  useEffect(() => {
    const unauthorized = () => { setUser(null); setReady(true); navigate('/login'); };
    window.addEventListener('optimeal:unauthorized', unauthorized);
    return () => window.removeEventListener('optimeal:unauthorized', unauthorized);
  }, [navigate]);
  useEffect(() => {
    if (!localStorage.getItem('optimeal_token')) return undefined;
    let active = true;
    api('/auth/profile')
      .then((profile) => {
        if (!active) return;
        localStorage.setItem('optimeal_user', JSON.stringify(profile));
        setUser(profile);
      })
      .catch((error) => {
        if (active && localStorage.getItem('optimeal_token')) {
          notify(`Could not refresh your profile: ${error.message}`, 'error');
        }
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const authValue = useMemo(() => ({
    user,
    ready,
    updateUser(profile) {
      localStorage.setItem('optimeal_user', JSON.stringify(profile));
      setUser(profile);
    },
    async login(credentials) {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      localStorage.setItem('optimeal_token', result.token);
      localStorage.setItem('optimeal_user', JSON.stringify(result.user));
      setUser(result.user); setReady(true); navigate('/dashboard');
    },
    async signup(details) {
      return api('/auth/signup', { method: 'POST', body: JSON.stringify(details) });
    },
    logout() {
      localStorage.removeItem('optimeal_token'); localStorage.removeItem('optimeal_user');
      setUser(null); setReady(true); navigate('/');
    }
  }), [user, ready, navigate]);
  return <AuthContext.Provider value={authValue}><ToastContext.Provider value={notify}>
    <Routes>
      <Route path="/" element={<Landing user={user} />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login login={authValue.login} />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup signup={authValue.signup} />} />
      <Route path="/dashboard" element={<Protected><OrganizationRoute moduleName="dashboard"><Shell><Dashboard /></Shell></OrganizationRoute></Protected>} />
      {Object.keys(definitions).map((resource) => <Route key={resource} path={`/${resource}`} element={<Protected><OrganizationRoute moduleName={resource}><Shell><RecordsPage resource={resource} /></Shell></OrganizationRoute></Protected>} />)}
      <Route path="/orders" element={<Protected><OrganizationRoute moduleName="orders"><Shell><OrdersPage /></Shell></OrganizationRoute></Protected>} />
      <Route path="/sales" element={<Protected><OrganizationRoute moduleName="sales"><Shell><SalesPage /></Shell></OrganizationRoute></Protected>} />
      <Route path="/calendar" element={<Protected><OrganizationRoute moduleName="calendar"><Shell><CalendarPage /></Shell></OrganizationRoute></Protected>} />
      <Route path="/predictions" element={<Protected><OrganizationRoute moduleName="predictions"><Shell><Predictions /></Shell></OrganizationRoute></Protected>} />
      <Route path="/billing" element={<Protected><OrganizationRoute moduleName="billing"><Shell><Billing /></Shell></OrganizationRoute></Protected>} />
      <Route path="/reports" element={<Protected><OrganizationRoute moduleName="reports"><Shell><Reports /></Shell></OrganizationRoute></Protected>} />
      <Route path="/profile" element={<Protected><Shell><ProfilePage /></Shell></Protected>} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
    <ToastHost toast={toast} />
  </ToastContext.Provider></AuthContext.Provider>;
}
