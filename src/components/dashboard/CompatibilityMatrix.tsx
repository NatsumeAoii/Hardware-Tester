import { useMemo } from 'react';
import { useHardwareCapabilities } from '../../hooks/useHardwareCapabilities';
import type { CapabilityStatus } from '../../lib/hardwareCapabilities';

const statusLabels: Record<CapabilityStatus, string> = {
    available: 'Ready',
    permission: 'Permission',
    partial: 'Partial',
    blocked: 'HTTPS',
    unsupported: 'Fallback',
};

const statusOrder: Record<CapabilityStatus, number> = {
    available: 0,
    permission: 1,
    partial: 2,
    blocked: 3,
    unsupported: 4,
};

export default function CompatibilityMatrix() {
    const { capabilities, profile, score, availableCount, totalCount } = useHardwareCapabilities();

    const platformSummary = useMemo(() => {
        const desktopReady = capabilities.filter(capability => capability.platform !== 'mobile' && (capability.status === 'available' || capability.status === 'permission')).length;
        const mobileReady = capabilities.filter(capability => capability.platform !== 'desktop' && (capability.status === 'available' || capability.status === 'permission')).length;

        return [
            { label: 'Desktop-ready', value: desktopReady },
            { label: 'Mobile-ready', value: mobileReady },
            { label: 'Touch points', value: profile.maxTouchPoints },
        ];
    }, [capabilities, profile.maxTouchPoints]);

    const sortedCapabilities = useMemo(() => [...capabilities].sort((left, right) => {
        const byStatus = statusOrder[left.status] - statusOrder[right.status];
        return byStatus || left.label.localeCompare(right.label);
    }), [capabilities]);

    return (
        <section className="compatibility-panel" aria-labelledby="compatibility-title">
            <div className="compatibility-head">
                <div>
                    <h2 id="compatibility-title" className="dash-section-title">Hardware Compatibility</h2>
                    <p className="compatibility-copy">
                        Detection adapts to desktop, tablet, and mobile browsers. Unsupported APIs show fallback guidance instead of hiding the test.
                    </p>
                </div>
                <div className="compatibility-score" aria-label="Hardware compatibility summary">
                    <strong>{score}%</strong>
                    <span>{availableCount}/{totalCount} ready</span>
                </div>
            </div>

            <div className="compatibility-profile" aria-label={`Detected profile: ${profile.formFactor}`}>
                <span>{profile.formFactor}</span>
                <span>{profile.secureContext ? 'secure context' : 'limited context'}</span>
                <span>{profile.viewportWidth}x{profile.viewportHeight}</span>
                {profile.standalone && <span>installed</span>}
            </div>

            <div className="compatibility-platforms">
                {platformSummary.map(item => (
                    <div key={item.label} className="compatibility-stat">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </div>

            <div className="compatibility-list">
                {sortedCapabilities.map(capability => (
                    <a
                        key={capability.id}
                        href={capability.testerId ? `#${capability.testerId}` : '#report'}
                        className={`compatibility-item ${capability.status}`}
                    >
                        <div className="compatibility-item__main">
                            <span className="compatibility-item__label">{capability.label}</span>
                            <span className="compatibility-item__reason">{capability.reason}</span>
                        </div>
                        <span className="compatibility-item__meta">{capability.platform}</span>
                        <span className="compatibility-item__status">{statusLabels[capability.status]}</span>
                    </a>
                ))}
            </div>

            <style>{`
        .compatibility-panel { margin-bottom: 2rem; }
        .compatibility-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 1rem; margin-bottom: 0.75rem;
        }
        .compatibility-copy {
          color: var(--text-muted); font-size: var(--text-xs);
          line-height: 1.6; max-width: 78ch; margin-top: -0.4rem;
        }
        .compatibility-score {
          min-width: 108px; min-height: 64px; padding: 0.65rem 0.8rem;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--surface-2), var(--surface-1));
          display: flex; flex-direction: column; justify-content: center; align-items: flex-end;
        }
        .compatibility-score strong { font-size: 1.45rem; line-height: 1; color: var(--text); font-family: var(--font-mono); }
        .compatibility-score span { font-size: var(--text-xs); color: var(--text-muted); }
        .compatibility-profile, .compatibility-platforms {
          display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 0.75rem;
        }
        .compatibility-profile span {
          padding: 0.28rem 0.65rem; border: 1px solid var(--border); border-radius: 999px;
          background: var(--surface-1); color: var(--text-muted); font-size: var(--text-xs); text-transform: capitalize;
        }
        .compatibility-platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .compatibility-stat {
          min-height: 56px; padding: 0.65rem 0.8rem; border: 1px solid var(--border);
          border-radius: var(--radius-sm); background: var(--surface-1);
          display: flex; justify-content: space-between; align-items: center; gap: 1rem;
        }
        .compatibility-stat span { color: var(--text-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; }
        .compatibility-stat strong { color: var(--text); font-size: var(--text-lg); font-family: var(--font-mono); }
        .compatibility-list {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 0.5rem;
        }
        .compatibility-item {
          min-height: 76px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 0.75rem; align-items: center; padding: 0.75rem;
          border: 1px solid var(--border); border-radius: var(--radius-sm);
          background: var(--surface-1); color: var(--text); text-decoration: none;
          transition: border-color var(--transition), transform var(--transition), background var(--transition);
        }
        .compatibility-item:hover, .compatibility-item:focus-visible {
          border-color: rgba(59,130,246,0.35); background: var(--surface-2); transform: translateY(-1px);
        }
        .compatibility-item__main { min-width: 0; display: flex; flex-direction: column; gap: 0.12rem; }
        .compatibility-item__label { font-size: var(--text-sm); font-weight: 650; }
        .compatibility-item__reason {
          color: var(--text-muted); font-size: 11px; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .compatibility-item__meta, .compatibility-item__status {
          border-radius: 999px; padding: 0.2rem 0.5rem; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap;
        }
        .compatibility-item__meta { color: var(--text-muted); background: var(--surface-2); }
        .compatibility-item__status { color: var(--text); border: 1px solid var(--border); }
        .compatibility-item.available .compatibility-item__status { color: var(--success); border-color: rgba(34,197,94,0.45); }
        .compatibility-item.permission .compatibility-item__status { color: var(--primary); border-color: rgba(59,130,246,0.45); }
        .compatibility-item.partial .compatibility-item__status { color: var(--warning); border-color: rgba(245,158,11,0.45); }
        .compatibility-item.blocked .compatibility-item__status,
        .compatibility-item.unsupported .compatibility-item__status { color: var(--text-muted); }
        @media (max-width: 640px) {
          .compatibility-head { flex-direction: column; }
          .compatibility-score { width: 100%; align-items: flex-start; }
          .compatibility-list { grid-template-columns: 1fr; }
          .compatibility-item { grid-template-columns: minmax(0, 1fr); align-items: start; }
          .compatibility-item__meta, .compatibility-item__status { width: fit-content; }
        }
      `}</style>
        </section>
    );
}
