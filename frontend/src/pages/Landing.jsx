import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Baby,
  Brain,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileHeart,
  HeartPulse,
  LockKeyhole,
  MessageCircleHeart,
  Pill,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  UserRoundCheck,
  UsersRound,
  Clock3,
  Bone,
  Syringe,
} from 'lucide-react';
import Logo from '../components/Logo';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../utils/format';

const FEATURES = [
  {
    icon: CalendarCheck2,
    title: 'Effortless appointments',
    text: 'Find the right specialist, see live availability and book a time in seconds — with double-booking protection built in.',
    tone: 'teal',
  },
  {
    icon: MessageCircleHeart,
    title: 'AI health companion',
    text: 'Ask general health questions any time. Clear, cautious guidance with emergency signposting and no pretend diagnoses.',
    tone: 'blue',
  },
  {
    icon: Pill,
    title: 'Medicine reminders',
    text: 'A gentle daily schedule for every prescription, with taken or skipped tracking and browser notifications.',
    tone: 'green',
  },
  {
    icon: FileHeart,
    title: 'Secure medical records',
    text: 'Upload PDFs, JPGs and PNGs into a private vault. Only you and the doctors you see can access them.',
    tone: 'violet',
  },
  {
    icon: Stethoscope,
    title: 'Doctor workspace',
    text: 'Review requests, confirm visits, keep clinical notes and understand your patients — without the paperwork.',
    tone: 'amber',
  },
  {
    icon: Activity,
    title: 'Live health insights',
    text: 'Beautiful dashboards that turn your appointments, adherence and activity into a clear picture of your health.',
    tone: 'rose',
  },
];

const SPECIALTIES = [
  { name: 'Cardiology', icon: HeartPulse },
  { name: 'Neurology', icon: Brain },
  { name: 'Pediatrics', icon: Baby },
  { name: 'Dermatology', icon: Sparkles },
  { name: 'Orthopedics', icon: Bone },
  { name: 'Ophthalmology', icon: Eye },
  { name: 'General Medicine', icon: Stethoscope },
  { name: 'Vaccination', icon: Syringe },
];

const TESTIMONIALS = [
  {
    quote:
      'I booked a cardiology follow-up during my lunch break and had the confirmation before I finished my coffee. It finally feels like healthcare respects my time.',
    name: 'Priya S.',
    role: 'Patient · Bengaluru',
    rating: 5,
  },
  {
    quote:
      'The medicine reminders are the first thing that has actually helped my father stay consistent. The dashboard gives me peace of mind without hovering.',
    name: 'Rahul V.',
    role: 'Caregiver · Mumbai',
    rating: 5,
  },
  {
    quote:
      'As a doctor, I can see exactly what I need and nothing I don’t. Approving requests takes seconds, and my availability is always accurate.',
    name: 'Dr. Arjun S.',
    role: 'Cardiologist · MediCare partner',
    rating: 5,
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Logo />
          <nav className="site-links" aria-label="Landing navigation">
            <a href="#features">Features</a>
            <a href="#specialties">Specialties</a>
            <a href="#how-it-works">How it works</a>
            <a href="#safety">Safety</a>
          </nav>
          <div className="site-nav-actions">
            {user ? (
              <Link to={roleHome(user.role)} className="btn btn-primary btn-sm">
                Open dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Get started <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-bg-orb hero-bg-orb-one" />
          <div className="hero-bg-orb hero-bg-orb-two" />
          <div className="section-inner hero-inner">
            <div className="hero-copy">
              <span className="hero-badge">
                <span className="hero-badge-dot" /> AI-powered care, human-first
              </span>
              <h1>
                Smarter care for
                <br />
                <span className="gradient-text">every part of you.</span>
              </h1>
              <p className="hero-lede">
                One calm space for appointments, medicines, medical records and trusted health
                guidance — built to make looking after yourself feel effortless.
              </p>
              <div className="hero-actions">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start your health journey <ArrowRight size={18} />
                </Link>
                <a href="#features" className="btn btn-secondary btn-lg">
                  Explore features
                </a>
              </div>
              <div className="hero-trust">
                <div className="avatar-stack">
                  <Avatar name="Priya Sharma" size="xs" />
                  <Avatar name="Rahul Verma" size="xs" />
                  <Avatar name="Neha Gupta" size="xs" />
                  <Avatar name="Kabir Singh" size="xs" />
                  <span className="avatar-stack-more">12k+</span>
                </div>
                <div className="hero-trust-copy">
                  <div className="stars">
                    {Array.from({ length: 5 }).map((_star, index) => (
                      <Star key={index} size={14} fill="currentColor" />
                    ))}
                    <strong>4.9</strong>
                  </div>
                  <span>Loved by patients and doctors alike</span>
                </div>
              </div>
              <div className="hero-assurances">
                <span><ShieldCheck size={14} /> Encrypted records</span>
                <span><CheckCircle2 size={14} /> Verified doctors</span>
                <span><LockKeyhole size={14} /> Private by default</span>
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              <div className="hero-visual-glow" />
              <div className="mock-app">
                <div className="mock-side">
                  <div className="mock-logo"><HeartPulse size={17} /></div>
                  <span className="mock-nav active" />
                  <span className="mock-nav" />
                  <span className="mock-nav" />
                  <span className="mock-nav" />
                  <div className="mock-side-foot" />
                </div>
                <div className="mock-main">
                  <div className="mock-topbar">
                    <div>
                      <span className="mock-kicker">Tuesday, 18 June</span>
                      <strong>Good morning, Priya</strong>
                    </div>
                    <div className="mock-avatar">PS</div>
                  </div>
                  <div className="mock-stats">
                    <div className="mock-stat">
                      <span className="mock-stat-icon teal"><CalendarCheck2 size={14} /></span>
                      <small>Upcoming</small>
                      <strong>03</strong>
                      <span className="mock-trend">+2 this week</span>
                    </div>
                    <div className="mock-stat">
                      <span className="mock-stat-icon blue"><Pill size={14} /></span>
                      <small>Medicines</small>
                      <strong>02</strong>
                      <span className="mock-trend">On track</span>
                    </div>
                    <div className="mock-stat">
                      <span className="mock-stat-icon green"><FileHeart size={14} /></span>
                      <small>Reports</small>
                      <strong>08</strong>
                      <span className="mock-trend">All secure</span>
                    </div>
                  </div>
                  <div className="mock-chart-card">
                    <div className="mock-chart-head">
                      <div>
                        <small>Health activity</small>
                        <strong>Your week in motion</strong>
                      </div>
                      <span>Last 7 days</span>
                    </div>
                    <svg viewBox="0 0 360 110" className="mock-chart" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="mockFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,82 C30,72 44,55 70,60 C100,66 112,42 140,48 C166,54 180,30 210,36 C240,42 256,20 284,26 C312,32 330,14 360,18 L360,110 L0,110 Z"
                        fill="url(#mockFill)"
                      />
                      <path
                        d="M0,82 C30,72 44,55 70,60 C100,66 112,42 140,48 C166,54 180,30 210,36 C240,42 256,20 284,26 C312,32 330,14 360,18"
                        fill="none"
                        stroke="#0d9488"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="284" cy="26" r="4.5" fill="#fff" stroke="#0d9488" strokeWidth="2.5" />
                    </svg>
                    <div className="mock-days">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                        <span key={index}>{day}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mock-bottom">
                    <div className="mock-mini">
                      <div className="mock-mini-icon teal"><Stethoscope size={14} /></div>
                      <div>
                        <strong>Dr. Arjun Sharma</strong>
                        <small>Cardiology · 10:00 AM</small>
                      </div>
                      <span className="mock-status">Confirmed</span>
                    </div>
                    <div className="mock-mini">
                      <div className="mock-mini-icon blue"><Pill size={14} /></div>
                      <div>
                        <strong>Metformin 500mg</strong>
                        <small>After breakfast · 8:00 AM</small>
                      </div>
                      <span className="mock-check"><CheckCircle2 size={16} /></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="floating-card floating-ai">
                <span className="floating-ai-icon"><Sparkles size={17} /></span>
                <div>
                  <strong>MediCare AI</strong>
                  <span>Your health summary is ready</span>
                </div>
                <span className="floating-online" />
              </div>

              <div className="floating-card floating-appt">
                <span className="floating-appt-icon"><CalendarCheck2 size={18} /></span>
                <div>
                  <small>Next appointment</small>
                  <strong>Today · 10:00 AM</strong>
                  <span>Dr. Arjun Sharma</span>
                </div>
              </div>

              <div className="floating-pill">
                <ShieldCheck size={15} /> Records encrypted
              </div>
            </div>
          </div>

          <div className="section-inner">
            <div className="metrics-band">
              <div>
                <strong>12,000+</strong>
                <span>Care interactions</span>
              </div>
              <div>
                <strong>180+</strong>
                <span>Verified specialists</span>
              </div>
              <div>
                <strong>98%</strong>
                <span>Appointment adherence</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>AI health guidance</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section features-section" id="features">
          <div className="section-inner">
            <div className="section-heading">
              <span className="eyebrow">Everything in one place</span>
              <h2>A calmer way to manage your care.</h2>
              <p>
                Thoughtfully designed tools for patients, doctors and administrators — without the
                clutter that usually comes with healthcare software.
              </p>
            </div>
            <div className="feature-grid">
              {FEATURES.map((feature) => (
                <article className={`feature-card feature-${feature.tone}`} key={feature.title}>
                  <span className="feature-icon">
                    <feature.icon size={23} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <span className="feature-link">Included in your workspace <ChevronRight size={14} /></span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section specialties-section" id="specialties">
          <div className="section-inner specialties-inner">
            <div className="specialties-copy">
              <span className="eyebrow">Specialist network</span>
              <h2>Care for every chapter of life.</h2>
              <p>
                Our directory connects you with verified specialists across the areas that matter
                most. Transparent profiles, real availability, no guesswork.
              </p>
              <ul className="check-list">
                <li><CheckCircle2 size={17} /> Verified qualifications and experience</li>
                <li><CheckCircle2 size={17} /> Live slots with instant confirmation</li>
                <li><CheckCircle2 size={17} /> Transparent consultation fees</li>
              </ul>
              <Link to="/register" className="btn btn-primary">
                <UsersRound size={17} /> Browse specialists
              </Link>
            </div>
            <div className="specialty-grid">
              {SPECIALTIES.map((specialty) => (
                <div className="specialty-tile" key={specialty.name}>
                  <span><specialty.icon size={21} /></span>
                  <strong>{specialty.name}</strong>
                  <small>Verified doctors</small>
                  <ChevronRight size={15} className="specialty-arrow" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section how-section" id="how-it-works">
          <div className="section-inner">
            <div className="section-heading">
              <span className="eyebrow">How it works</span>
              <h2>From “I should see someone” to “I’m booked.”</h2>
              <p>Three simple steps. No phone queues, no missing paperwork.</p>
            </div>
            <div className="steps-grid">
              <article className="step-card">
                <span className="step-number">01</span>
                <span className="step-icon"><UserRoundCheck size={24} /></span>
                <h3>Create your health profile</h3>
                <p>Sign up securely as a patient or doctor. Your information stays private and yours.</p>
              </article>
              <article className="step-card">
                <span className="step-number">02</span>
                <span className="step-icon"><Stethoscope size={24} /></span>
                <h3>Choose care that fits</h3>
                <p>Search by specialty, compare verified doctors and pick a live time slot that works.</p>
              </article>
              <article className="step-card">
                <span className="step-number">03</span>
                <span className="step-icon"><ClipboardCheck size={24} /></span>
                <h3>Stay on track effortlessly</h3>
                <p>Get confirmations, medicine reminders and a secure home for every report.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section safety-section" id="safety">
          <div className="section-inner safety-inner">
            <div className="safety-visual">
              <div className="safety-orb" />
              <div className="safety-chat-card">
                <div className="safety-chat-head">
                  <span className="ai-avatar"><Sparkles size={18} /></span>
                  <div>
                    <strong>MediCare AI</strong>
                    <span><span className="live-dot" /> Online · safety-first guidance</span>
                  </div>
                </div>
                <div className="safety-bubble user">I’ve had a headache for two days. Should I take antibiotics?</div>
                <div className="safety-bubble ai">
                  Antibiotics treat bacterial infections, not most headaches — and they should only
                  be used when a clinician prescribes them. I can share general headache
                  information and help you prepare for a visit.
                </div>
                <div className="safety-disclaimer">
                  <ShieldCheck size={14} /> No diagnosis. No prescriptions. Just safer guidance.
                </div>
              </div>
              <div className="safety-float-card">
                <span><Clock3 size={18} /></span>
                <div>
                  <strong>Emergency-aware</strong>
                  <small>Redirects urgent symptoms immediately</small>
                </div>
              </div>
            </div>
            <div className="safety-copy">
              <span className="eyebrow">Responsible AI</span>
              <h2>Guidance you can trust. Limits you can see.</h2>
              <p>
                MediCare AI is built to inform — never to replace a doctor. Clear boundaries are
                part of the design, not an afterthought.
              </p>
              <ul className="safety-list">
                <li>
                  <span><ShieldCheck size={17} /></span>
                  <div>
                    <strong>Never diagnoses or prescribes</strong>
                    <p>It explains possibilities and prepares you for a professional consultation.</p>
                  </div>
                </li>
                <li>
                  <span><HeartPulse size={17} /></span>
                  <div>
                    <strong>Escalates emergencies</strong>
                    <p>Red-flag symptoms immediately surface local emergency guidance.</p>
                  </div>
                </li>
                <li>
                  <span><LockKeyhole size={17} /></span>
                  <div>
                    <strong>Your conversations stay private</strong>
                    <p>Chat history is tied to your account and protected by authenticated APIs.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section testimonials-section">
          <div className="section-inner">
            <div className="section-heading">
              <span className="eyebrow">Loved by people, trusted by clinicians</span>
              <h2>Better experiences, not just better software.</h2>
            </div>
            <div className="testimonial-grid">
              {TESTIMONIALS.map((testimonial) => (
                <article className="testimonial-card" key={testimonial.name}>
                  <div className="stars">
                    {Array.from({ length: testimonial.rating }).map((_star, index) => (
                      <Star key={index} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p>“{testimonial.quote}”</p>
                  <div className="testimonial-author">
                    <Avatar name={testimonial.name} size="sm" />
                    <div>
                      <strong>{testimonial.name}</strong>
                      <span>{testimonial.role}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section cta-section">
          <div className="section-inner">
            <div className="cta-banner">
              <div className="cta-orb cta-orb-one" />
              <div className="cta-orb cta-orb-two" />
              <div className="cta-copy">
                <span className="cta-eyebrow"><Sparkles size={14} /> Your health, beautifully organised</span>
                <h2>Take the next step toward calmer care.</h2>
                <p>Create your free workspace in under a minute. No credit card, no confusion.</p>
              </div>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-white btn-lg">
                  Create free account <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-ghost-light btn-lg">I already have an account</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <Logo />
            <p>A smarter, softer way to look after your health — for patients, doctors and care teams.</p>
          </div>
          <div className="footer-links">
            <div>
              <strong>Product</strong>
              <a href="#features">Features</a>
              <a href="#specialties">Specialties</a>
              <a href="#how-it-works">How it works</a>
            </div>
            <div>
              <strong>Company</strong>
              <a href="#safety">Responsible AI</a>
              <a href="#testimonials">Stories</a>
              <Link to="/register">Get started</Link>
            </div>
            <div>
              <strong>Account</strong>
              <Link to="/login">Sign in</Link>
              <Link to="/register">Create account</Link>
              <a href="mailto:care@medicare.ai">care@medicare.ai</a>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} MediCare AI. All rights reserved.</span>
          <span>MediCare AI provides information, not medical advice. In an emergency, call local emergency services.</span>
        </div>
      </footer>
    </div>
  );
}
