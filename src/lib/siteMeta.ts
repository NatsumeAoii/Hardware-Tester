export const siteMeta = {
    name: 'Hardware Diagnostic Suite',
    shortName: 'Hardware Suite',
    description: 'Browser-based hardware diagnostics for keyboards, mice, displays, cameras, microphones, sensors, networks, printers, and mobile devices.',
    locale: 'en',
    keywords: [
        'hardware diagnostic',
        'keyboard test',
        'mouse test',
        'screen test',
        'microphone test',
        'webcam test',
        'printer test',
        'mobile sensor test',
    ],
    themeColor: {
        dark: '#0b0d13',
        light: '#f5f7fa',
    },
};

export const siteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteMeta.name,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Windows, macOS, Linux, Android, iOS',
    description: siteMeta.description,
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
    },
};
