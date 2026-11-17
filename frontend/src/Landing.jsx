import {
  Activity, ArrowRight, BarChart3, CalendarCheck, ChefHat, ClipboardCheck,
  CreditCard, Leaf, Package, Sparkles, Target, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { organizationProfile } from './organizationTypes.js';

const features = [
  { icon: Sparkles, title: 'AI food demand prediction', text: 'Learn from your own attendance history to prepare the right amount for each service.' },
  { icon: ChefHat, title: 'Smart menu management', text: 'Plan and price breakfast, lunch, dinner and snacks by date—all in one place.' },
  { icon: Users, title: 'Organization-specific management', text: 'Keep the right people, customers, clients or event records organized for your operation.' },
  { icon: ClipboardCheck, title: 'Meal and service records', text: 'Track relevant attendance, registrations, orders or event demand.' },
  { icon: Package, title: 'Food inventory management', text: 'Track ingredient quantities and catch low-stock items before they become urgent.' },
  { icon: CreditCard, title: 'Billing management', text: 'Build itemized customer bills with menu pricing and printable invoices.' },
  { icon: BarChart3, title: 'Reports & analytics', text: 'Understand consumption, waste and billing over daily, weekly and monthly periods.' },
  { icon: Activity, title: 'One connected workspace', text: 'Bring operations together with a clear, calm view of your organization’s data.' }
];

const steps = [
  { number: '01', title: 'Create your workspace', text: 'Register your organization and invite your team when you’re ready.' },
  { number: '02', title: 'Add your records', text: 'Start with the people, menus, ingredients and service records that fit your organization.' },
  { number: '03', title: 'See your operation clearly', text: 'Follow preparation, consumption, stock and billing from one dashboard.' },
  { number: '04', title: 'Plan with confidence', text: 'Once you have enough history, generate a demand forecast from your own data.' }
];

function DashboardPreview({ user }) {
  const profile = user ? organizationProfile(user.organizationType) : null;
  const stats = profile
    ? profile.stats.slice(0, 4).map(([label, , format]) => [label, format === 'currency' ? '₹0' : format === 'percent' ? '0%' : '0'])
    : [['Diners', '0'], ['Meals today', '0'], ['Waste rate', '0%'], ['Billing total', '₹0']];
  return <div className="landing-preview">
    <div className="preview-topbar"><span className="preview-logo"><ChefHat size={13} /></span><b>Workspace overview</b><span className="preview-period">Today <span>⌄</span></span></div>
    <div className="preview-greeting"><div><span>YOUR KITCHEN, AT A GLANCE</span><b>A clearer picture, every day.</b></div><span className="preview-date">TODAY</span></div>
    <div className="preview-stats">
      {stats.map(([label, value]) => <div className="preview-stat" key={label}><span>{label}</span><b>{value}</b></div>)}
    </div>
    <div className="preview-chart">
      <div className="preview-chart-head"><span><b>{profile?.chartTitle || 'Your operation, at a glance'}</b><small>{profile?.chartDescription || 'A clear view of daily service'}</small></span><span className="preview-chart-legend"><i /> No records yet</span></div>
      <div className="preview-chart-empty"><span className="preview-chart-icon"><Activity size={19} /></span><span>{profile ? 'Add real records to see your insights' : 'Your dashboard starts with your data'}</span><div className="preview-baseline" /></div>
    </div>
    <div className="preview-note"><span><Sparkles size={14} /></span><b>Your workspace starts with your data.</b><small>No sample accounts or pre-filled records.</small></div>
  </div>;
}

export default function Landing({ user }) {
  return <main className="landing-page">
    <header className="landing-nav">
      <Link to="/" className="landing-brand" aria-label="OptiMeal AI home"><span className="brand-mark"><ChefHat size={19} /></span><span>opti<span>meal</span><b>AI</b></span></Link>
      <nav className="landing-nav-links" aria-label="Main navigation">
        <a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#benefits">Why OptiMeal</a>
      </nav>
      <div className="landing-nav-actions">
        <Link className="landing-login-link" to={user ? '/dashboard' : '/login'}>{user ? 'Dashboard' : 'Login'}</Link>
        <Link className="button primary landing-nav-cta" to={user ? '/dashboard' : '/signup'}>{user ? 'Open workspace' : 'Get Started'} <ArrowRight size={15} /></Link>
      </div>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <div className="landing-eyebrow"><span /> THOUGHTFUL FOOD OPERATIONS</div>
        <h1>Smarter Food<br /><span>Management</span><br />Starts Here</h1>
        <p>OptiMeal AI brings your menus, attendance and inventory together—so your team can plan with clarity, serve with confidence and waste less.</p>
        <div className="landing-hero-actions">
          <Link className="button primary landing-hero-button" to={user ? '/dashboard' : '/login'}>{user ? 'Go to dashboard' : 'Login'} <ArrowRight size={16} /></Link>
          <Link className="button secondary landing-hero-button" to={user ? '/dashboard' : '/signup'}>{user ? 'Open your workspace' : 'Get Started'}</Link>
        </div>
        <div className="landing-trust"><span className="landing-trust-icon"><Leaf size={14} /></span><span>Better planning starts with the data you already have.</span></div>
      </div>
      <div className="landing-hero-visual">
        <div className="hero-orbit hero-orbit-one" /><div className="hero-orbit hero-orbit-two" />
        <div className="hero-spark hero-spark-one">✦</div><div className="hero-spark hero-spark-two">✧</div>
        <DashboardPreview user={user} />
        <div className="hero-float float-forecast"><span><Target size={15} /></span><div><b>Forecast when ready</b><small>Powered by your history</small></div></div>
        <div className="hero-float float-plan"><span><CalendarCheck size={15} /></span><div><b>One connected plan</b><small>Menu · attendance · stock</small></div></div>
      </div>
      <a className="hero-scroll" href="#features"><span /> Explore the platform</a>
    </section>

    <section className="landing-section features-section" id="features">
      <div className="landing-section-heading"><div className="landing-eyebrow"><span /> EVERYTHING IN ONE WORKSPACE</div><h2>Considered tools for<br /><em>every part of service.</em></h2><p>From the first menu plan to the last invoice, the details stay connected.</p></div>
      <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-tone-${index % 4}`}><Icon size={19} strokeWidth={1.8} /></span><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="landing-section workflow-section" id="how-it-works">
      <div className="workflow-intro"><div className="landing-eyebrow"><span /> SIMPLE TO GET STARTED</div><h2>From first record<br />to <em>better decisions.</em></h2><p>No complicated setup. Build your workspace at your own pace and let your own information guide the way.</p><Link className="landing-inline-link" to="/signup">Create your workspace <ArrowRight size={15} /></Link></div>
      <div className="workflow-steps">{steps.map((step, index) => <article className="workflow-step" key={step.number}><div className="step-marker"><span>{step.number}</span>{index < steps.length - 1 && <i />}</div><div><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div>
    </section>

    <section className="landing-benefits" id="benefits">
      <div className="benefits-heading"><div className="landing-eyebrow"><span /> MORE THOUGHTFUL BY DESIGN</div><h2>Good for your kitchen.<br /><em>Good for what’s next.</em></h2><p>Make everyday decisions easier with a workspace built around your team’s real information.</p></div>
      <div className="benefit-grid">
        <article className="benefit-card"><span className="benefit-icon benefit-lilac"><Leaf size={20} /></span><h3>Reduce avoidable waste</h3><p>Compare what you prepare with what diners actually consume, then learn from the difference.</p><span className="benefit-accent">Measure thoughtfully <ArrowRight size={13} /></span></article>
        <article className="benefit-card"><span className="benefit-icon benefit-peach"><Target size={20} /></span><h3>Plan with real context</h3><p>Keep attendance, menus and ingredient levels together to make the next service easier to plan.</p><span className="benefit-accent">Stay one step ahead <ArrowRight size={13} /></span></article>
        <article className="benefit-card"><span className="benefit-icon benefit-blue"><Activity size={20} /></span><h3>Manage with less friction</h3><p>Replace scattered lists with one clear view of operations, reports and customer billing.</p><span className="benefit-accent">Bring work together <ArrowRight size={13} /></span></article>
      </div>
    </section>

    <section className="landing-cta">
      <div className="cta-decoration cta-circle-one" /><div className="cta-decoration cta-circle-two" />
      <span className="cta-spark"><Sparkles size={18} /></span>
      <div><span className="landing-eyebrow">YOUR WORKSPACE, YOUR WAY</span><h2>Start with what you know.</h2><p>Bring your team’s food operation into clearer focus—one record at a time.</p></div>
      <Link className="button cta-button" to={user ? '/dashboard' : '/signup'}>{user ? 'Open your workspace' : 'Get Started'} <ArrowRight size={16} /></Link>
    </section>

    <footer className="landing-footer">
      <div className="footer-main">
        <div className="footer-about"><Link to="/" className="landing-brand"><span className="brand-mark"><ChefHat size={19} /></span><span>opti<span>meal</span><b>AI</b></span></Link><p>Food demand planning and operations management for organizations of every kind.</p><small>Food operations platform · OptiMeal AI</small></div>
        <div className="footer-column"><b>Explore</b><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#benefits">Benefits</a></div>
        <div className="footer-column"><b>Your workspace</b><Link to="/login">Login</Link><Link to="/signup">Get Started</Link><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Back to top</a></div>
        <div className="footer-note"><span><Sparkles size={15} /></span><b>Plan a little better.</b><p>Every meaningful forecast begins with the records your team creates.</p></div>
      </div>
      <div className="footer-bottom"><span>© 2026 OptiMeal AI. Built for better food operations.</span><span>Less waste. More good. <span>✦</span></span></div>
    </footer>
  </main>;
}
