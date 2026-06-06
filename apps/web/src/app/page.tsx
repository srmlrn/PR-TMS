import Link from 'next/link';
import { LANDING_ROLES } from '@/lib/roles';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landingHero">
        <span className="landingIcon" aria-hidden>
          🛕
        </span>
        <div className="landingEyebrow">Sacred Digital Platform</div>
        <h1 className="landingTitle">
          <span className="landingShine">Temple Management</span>
          <br />
          System
        </h1>
        <p className="landingSub">
          A global, multi-tenant, multi-currency SaaS for temples in the USA, India, Canada, and
          beyond.
        </p>
        <p className="landingMeta">
          mockui-sn46 · Sri Venkateswara Temple (demo tenant) · Sign in to explore
        </p>
        <Link href="/login" className="landingLoginBtn">
          Sign in →
        </Link>
      </div>
      <div className="landingRoles">
        {LANDING_ROLES.map((role) => (
          <Link
            key={role.role}
            href={`/login?email=${encodeURIComponent(role.loginEmail)}&role=${role.role}`}
            className="roleCard"
          >
            <span className="roleEmoji" aria-hidden>
              {role.emoji}
            </span>
            <h3 className="roleTitle">{role.title}</h3>
            <p className="roleDesc">{role.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
