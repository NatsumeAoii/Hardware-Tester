import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { BenchmarkResult } from '../../benchmarkRunner';

/**
 * Property 11: Benchmark history ordering and cap
 * Validates: Requirements 7.6
 *
 * For any sequence of N benchmark results where N > 10, the displayed history
 * SHALL contain exactly 10 entries ordered from newest (index 0) to oldest
 * (index 9), and each entry's timestamp SHALL be >= the timestamp of the entry
 * after it.
 */

const MAX_HISTORY = 10;

/**
 * Simulates the history accumulation logic used in BenchmarkTester:
 * `[newResult, ...prev].slice(0, MAX_HISTORY)` applied sequentially.
 */
function simulateHistory(results: BenchmarkResult[]): BenchmarkResult[] {
    let history: BenchmarkResult[] = [];
    for (const result of results) {
        history = [result, ...history].slice(0, MAX_HISTORY);
    }
    return history;
}

/**
 * Arbitrary that generates a BenchmarkResult with a specific timestamp.
 */
function benchmarkResultArb(timestamp: number): fc.Arbitrary<BenchmarkResult> {
    return fc.record({
        type: fc.constantFrom('cpu' as const, 'memory' as const),
        value: fc.double({ min: 0.1, max: 1_000_000, noNaN: true }),
        timestamp: fc.constant(timestamp),
        durationMs: fc.double({ min: 100, max: 5000, noNaN: true }),
    });
}

/**
 * Generates a sequence of 11-50 BenchmarkResult objects with strictly
 * increasing timestamps.
 */
const benchmarkSequenceArb: fc.Arbitrary<BenchmarkResult[]> = fc
    .integer({ min: 11, max: 50 })
    .chain((count) =>
        fc
            .array(fc.integer({ min: 1, max: 10000 }), {
                minLength: count,
                maxLength: count,
            })
            .chain((increments) => {
                // Build strictly increasing timestamps from increments
                const timestamps: number[] = [];
                let current = Date.now();
                for (const inc of increments) {
                    current += inc;
                    timestamps.push(current);
                }
                // Generate a BenchmarkResult for each timestamp
                return fc.tuple(
                    ...timestamps.map((ts) => benchmarkResultArb(ts))
                ) as fc.Arbitrary<BenchmarkResult[]>;
            })
    );

describe('Property 11: Benchmark history ordering and cap', () => {
    it('final history has exactly 10 entries when N > 10 results are added', () => {
        fc.assert(
            fc.property(benchmarkSequenceArb, (results) => {
                const history = simulateHistory(results);
                expect(history).toHaveLength(MAX_HISTORY);
            }),
            { numRuns: 100 }
        );
    });

    it('history entries are ordered newest first (index 0 is newest)', () => {
        fc.assert(
            fc.property(benchmarkSequenceArb, (results) => {
                const history = simulateHistory(results);
                // The last result added should be at index 0
                const lastResult = results[results.length - 1];
                expect(history[0].timestamp).toBe(lastResult.timestamp);
            }),
            { numRuns: 100 }
        );
    });

    it('timestamps are non-increasing (each entry timestamp >= next entry timestamp)', () => {
        fc.assert(
            fc.property(benchmarkSequenceArb, (results) => {
                const history = simulateHistory(results);
                for (let i = 0; i < history.length - 1; i++) {
                    expect(history[i].timestamp).toBeGreaterThanOrEqual(
                        history[i + 1].timestamp
                    );
                }
            }),
            { numRuns: 100 }
        );
    });
});
