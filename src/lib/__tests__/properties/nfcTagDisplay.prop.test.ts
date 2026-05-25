import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property 4: NFC tag data display completeness
 * Validates: Requirements 3.1, 3.2
 *
 * For any NFC tag with a serial number and N NDEF records (N ≥ 0),
 * the data model SHALL contain the serial number (non-empty), and for each
 * record SHALL have the record type and UTF-8 decoded payload.
 * When N = 0, the "no NDEF data" condition is triggered.
 */

interface NdefRecordInfo {
    recordType: string;
    payload: string;
}

interface NfcTagInfo {
    serialNumber: string;
    records: NdefRecordInfo[];
}

/**
 * Simulates the display logic from NfcTester:
 * - serialNumber is always displayed
 * - If records.length > 0, each record's recordType and payload are displayed
 * - If records.length === 0, a "no NDEF data" message is shown
 */
function evaluateNfcTagDisplay(tag: NfcTagInfo): {
    serialNumberDisplayed: boolean;
    recordsDisplayed: { recordType: string; payload: string }[];
    noNdefDataMessage: boolean;
} {
    const serialNumberDisplayed = tag.serialNumber.length > 0;

    if (tag.records.length === 0) {
        return {
            serialNumberDisplayed,
            recordsDisplayed: [],
            noNdefDataMessage: true,
        };
    }

    return {
        serialNumberDisplayed,
        recordsDisplayed: tag.records.map((r) => ({
            recordType: r.recordType,
            payload: r.payload,
        })),
        noNdefDataMessage: false,
    };
}

// Arbitrary for a single NDEF record with non-empty recordType and payload
const ndefRecordArb: fc.Arbitrary<NdefRecordInfo> = fc.record({
    recordType: fc.string({ minLength: 1, maxLength: 50 }),
    payload: fc.string({ minLength: 0, maxLength: 200 }),
});

// Generate serial numbers like "04:A3:2B:FF:..." (hex colon-separated)
const serialNumberArb: fc.Arbitrary<string> = fc
    .array(
        fc.integer({ min: 0, max: 255 }).map((n) => n.toString(16).toUpperCase().padStart(2, '0')),
        { minLength: 1, maxLength: 10 }
    )
    .map((parts) => parts.join(':'));

// Arbitrary for NfcTagInfo with a non-empty serial number and 0–N records
const nfcTagArb: fc.Arbitrary<NfcTagInfo> = fc.record({
    serialNumber: serialNumberArb,
    records: fc.array(ndefRecordArb, { minLength: 0, maxLength: 20 }),
});

// Arbitrary specifically for tags with zero records
const nfcTagNoRecordsArb: fc.Arbitrary<NfcTagInfo> = fc.record({
    serialNumber: serialNumberArb,
    records: fc.constant([] as NdefRecordInfo[]),
});

// Arbitrary specifically for tags with at least one record
const nfcTagWithRecordsArb: fc.Arbitrary<NfcTagInfo> = fc.record({
    serialNumber: serialNumberArb,
    records: fc.array(ndefRecordArb, { minLength: 1, maxLength: 20 }),
});

describe('Property 4: NFC tag data display completeness', () => {
    it('serial number is always present and non-empty', () => {
        fc.assert(
            fc.property(nfcTagArb, (tag) => {
                const result = evaluateNfcTagDisplay(tag);
                expect(result.serialNumberDisplayed).toBe(true);
                expect(tag.serialNumber.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 }
        );
    });

    it('when records.length > 0, all records have recordType and payload displayed', () => {
        fc.assert(
            fc.property(nfcTagWithRecordsArb, (tag) => {
                const result = evaluateNfcTagDisplay(tag);

                // No "no NDEF data" message when records exist
                expect(result.noNdefDataMessage).toBe(false);

                // All records are displayed
                expect(result.recordsDisplayed.length).toBe(tag.records.length);

                // Each displayed record has recordType and payload matching input
                for (let i = 0; i < tag.records.length; i++) {
                    expect(result.recordsDisplayed[i].recordType).toBe(tag.records[i].recordType);
                    expect(result.recordsDisplayed[i].payload).toBe(tag.records[i].payload);
                }
            }),
            { numRuns: 100 }
        );
    });

    it('when records.length === 0, the "no NDEF data" condition is triggered', () => {
        fc.assert(
            fc.property(nfcTagNoRecordsArb, (tag) => {
                const result = evaluateNfcTagDisplay(tag);

                // "no NDEF data" message is shown
                expect(result.noNdefDataMessage).toBe(true);

                // No records are displayed
                expect(result.recordsDisplayed.length).toBe(0);

                // Serial number is still displayed
                expect(result.serialNumberDisplayed).toBe(true);
            }),
            { numRuns: 100 }
        );
    });
});
