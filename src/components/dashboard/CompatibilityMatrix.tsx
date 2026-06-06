import { useMemo } from 'react';
import { useHardwareCapabilities } from '../../hooks/useHardwareCapabilities';
import type { CapabilityStatus } from '../../lib/hardwareCapabilities';
import '../../styles/CompatibilityMatrix.css';

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
        let desktopReady = 0;
        let mobileReady = 0;
        for (let i = 0; i < capabilities.length; i++) {
            const cap = capabilities[i];
            const isReady = cap.status === 'available' || cap.status === 'permission';
            if (isReady && cap.platform !== 'mobile') desktopReady++;
            if (isReady && cap.platform !== 'desktop') mobileReady++;
        }

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
        </section>
    );
}
