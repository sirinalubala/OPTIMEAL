import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChefHat, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function AuthBrand() {
  return <Link to="/" className="auth-brand"><span className="brand-mark"><ChefHat size={19} /></span><span>opti<span>meal</span><b>AI</b></span></Link>;
}

function AuthLayout({ children, eyebrow, title, description, variant = 'login' }) {
  return <main className={`auth-page auth-${variant}`}>
    <section className="auth-aside">
      <AuthBrand />
      <div className="auth-aside-copy">
        <span className="landing-eyebrow"><span /> INTELLIGENCE FOR EVERY MEAL</span>
        <h1>Good decisions<br />start with a<br /><em>clearer picture.</em></h1>
        <p>Keep daily food operations connected, thoughtful and ready for what’s next.</p>
        <div className="auth-aside-art"><div className="auth-art-orbit" /><div className="auth-art-center"><ChefHat size={32} /></div><span className="auth-art-dot dot-one" /><span className="auth-art-dot dot-two" /><span className="auth-art-dot dot-three" /></div>
      </div>
      <div className="auth-aside-foot">Less waste. More good. <span>© OptiMeal AI</span></div>
    </section>
    <section className="auth-main">
      <div className="auth-main-mobile-brand"><AuthBrand /></div>
      <div className="auth-card">
        <Link className="auth-back-link" to="/"><ArrowLeft size={14} /> Back to home</Link>
        <span className="auth-kicker">{eyebrow}</span>
        <h2>{title}</h2><p className="auth-description">{description}</p>
        {children}
      </div>
      <div className="auth-footer-note"><span className="auth-footer-dot" /> Your organization’s information stays private.</div>
    </section>
  </main>;
}

function PasswordInput({ label, value, onChange, autoComplete, required = true, minLength }) {
  const [visible, setVisible] = useState(false);
  return <label className="auth-field">{label}<span className="auth-password-wrap">
    <input type={visible ? 'text' : 'password'} required={required} minLength={minLength} maxLength="72" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} />
    <button className="auth-password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
  </span></label>;
}

export function Login({ login }) {
  const [values, setValues] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const registered = new URLSearchParams(location.search).get('registered') === '1';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try { await login(values); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return <AuthLayout variant="login" eyebrow="WELCOME BACK" title="Login to your workspace" description="Use your email address or User ID to continue.">
    {registered && <div className="auth-success" role="status"><Check size={16} /> Your organization is ready. Sign in with your new credentials.</div>}
    {error && <div className="auth-error" role="alert"><AlertTriangle size={16} />{error}</div>}
    <form className="auth-form" onSubmit={submit}>
      <label className="auth-field">Email or User ID<input type="text" autoComplete="username" required maxLength="190" placeholder="Enter your email or User ID" value={values.identifier} onChange={(event) => setValues({ ...values, identifier: event.target.value })} /></label>
      <PasswordInput label="Password" autoComplete="current-password" value={values.password} onChange={(password) => setValues({ ...values, password })} />
      <button className="button primary auth-submit" disabled={loading}>{loading ? <span className="spinner" /> : <>Login <ArrowRight size={16} /></>}</button>
    </form>
    <div className="auth-switch">New to OptiMeal AI? <Link to="/signup">Sign Up</Link></div>
    <div className="auth-security"><span /> Secure sign-in with encrypted password storage</div>
  </AuthLayout>;
}

const organizationTypes = [
  ['restaurant', 'Restaurant'],
  ['college_mess', 'College / University Mess'],
  ['hostel_mess', 'Hostel Mess'],
  ['corporate_cafeteria', 'Corporate Cafeteria'],
  ['catering_service', 'Catering Service'],
  ['hospital_canteen', 'Hospital / Institutional Canteen'],
  ['other', 'Other']
];

export function Signup({ signup }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '', organizationName: '', organizationType: '',
    email: '', userId: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key, value) { setValues((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signup(values);
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout variant="signup" eyebrow="A THOUGHTFUL PLACE TO START" title="Create your workspace" description="Set up your organization and your own secure sign-in.">
    {error && <div className="auth-error" role="alert"><AlertTriangle size={16} />{error}</div>}
    <form className="auth-form signup-form" onSubmit={submit}>
      <div className="auth-fields-grid">
        <label className="auth-field">Full name<input type="text" required maxLength="120" autoComplete="name" placeholder="Your full name" value={values.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label className="auth-field">Organization name<input type="text" required maxLength="140" autoComplete="organization" placeholder="Your restaurant or campus" value={values.organizationName} onChange={(event) => update('organizationName', event.target.value)} /></label>
        <label className="auth-field">Organization type<span className="auth-select-wrap"><select required value={values.organizationType} onChange={(event) => update('organizationType', event.target.value)}><option value="">Select an organization type</option>{organizationTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><span>⌄</span></span></label>
        <label className="auth-field">Email<input type="email" required maxLength="190" autoComplete="email" placeholder="you@organization.com" value={values.email} onChange={(event) => update('email', event.target.value)} /></label>
        <label className="auth-field">Create User ID<input type="text" required minLength="3" maxLength="40" pattern="[A-Za-z0-9._\\x2D]{3,40}" title="Use 3–40 letters, numbers, dots, underscores or hyphens." autoComplete="username" placeholder="Choose a unique User ID" value={values.userId} onChange={(event) => update('userId', event.target.value)} /></label>
        <PasswordInput label="Create password" autoComplete="new-password" minLength="12" value={values.password} onChange={(password) => update('password', password)} />
        <PasswordInput label="Confirm password" autoComplete="new-password" minLength="12" value={values.confirmPassword} onChange={(password) => update('confirmPassword', password)} />
      </div>
      <p className="password-hint"><Sparkles size={13} /> Use at least 12 characters for a stronger password.</p>
      <button className="button primary auth-submit" disabled={loading}>{loading ? <span className="spinner" /> : <>Create account <ArrowRight size={16} /></>}</button>
    </form>
    <div className="auth-switch">Already have an account? <Link to="/login">Login</Link></div>
  </AuthLayout>;
}
