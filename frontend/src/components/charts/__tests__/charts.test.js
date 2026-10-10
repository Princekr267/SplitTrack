import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let charts;
let MotionConfig;

before(async () => {
  server = await createServer({ server: { middlewareMode: true } });
  charts = await server.ssrLoadModule('./src/components/charts/index.js');
  const motionModule = await server.ssrLoadModule('motion/react');
  MotionConfig = motionModule.MotionConfig;
});

after(async () => {
  if (server) await server.close();
});

describe('Custom SVG Chart Primitives (SSR / Component Tests)', () => {
  describe('RingChart', () => {
    it('renders with empty data without crashing', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.RingChart, { segments: [], total: 0 })
      );
      assert.ok(html.includes('role="img"'));
      assert.ok(html.includes('<circle'));
    });

    it('renders with one data point', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.RingChart, {
          segments: [{ key: 'collected', label: 'Collected', value: 100000, color: 'var(--chart-owed)' }],
          total: 100000,
        })
      );
      assert.ok(html.includes('role="img"'));
      assert.ok(html.includes('Collected: ₹1,000'));
    });

    it('renders under reduced motion', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          MotionConfig,
          { reducedMotion: 'always' },
          React.createElement(charts.RingChart, {
            segments: [
              { key: 'collected', label: 'Collected', value: 750000, color: 'var(--chart-owed)' },
              { key: 'pending', label: 'Pending', value: 250000, color: 'var(--chart-pending)', hatch: true },
            ],
            total: 1000000,
          })
        )
      );
      assert.ok(html.includes('role="img"'));
      assert.ok(html.includes('ring-hatch-pending'));
    });
  });

  describe('DivergingBars', () => {
    it('renders graceful empty state when balances is empty', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.DivergingBars, { balances: [] })
      );
      assert.ok(html.includes('No participant balances recorded'));
    });

    it('renders with one participant', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.DivergingBars, {
          balances: [{ personId: 'p1', name: 'Aman', net: -50000 }],
        })
      );
      assert.ok(html.includes('role="img"'));
      assert.ok(html.includes('Aman'));
      assert.ok(html.includes('-₹500'));
    });

    it('renders top 6 and expander button for long lists', () => {
      const longList = Array.from({ length: 9 }, (_, i) => ({
        personId: `p${i}`,
        name: `Friend ${i + 1}`,
        net: (i - 4) * 20000,
      }));
      const html = renderToStaticMarkup(
        React.createElement(charts.DivergingBars, { balances: longList })
      );
      assert.ok(html.includes('Show all 9 members'));
      assert.ok(html.includes('Friend 1'));
      assert.ok(html.includes('Friend 6'));
    });
  });

  describe('AreaLineChart', () => {
    it('renders empty message when series is empty', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.AreaLineChart, { series: [] })
      );
      assert.ok(html.includes('No timeline data available'));
    });

    it('renders with a single point', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.AreaLineChart, {
          series: [{ date: '2026-10-01', collected: 100000 }],
        })
      );
      assert.ok(html.includes('role="img"'));
      assert.ok(html.includes('<svg'));
      assert.ok(html.includes('<path'));
    });

    it('renders with target line and pending markers under reduced motion', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          MotionConfig,
          { reducedMotion: 'always' },
          React.createElement(charts.AreaLineChart, {
            series: [
              { date: '2026-10-01', collected: 50000 },
              { date: '2026-10-02', collected: 120000 },
            ],
            targetValue: 200000,
            pendingMarkers: [{ date: '2026-10-02', amount: 30000 }],
          })
        )
      );
      assert.ok(html.includes('Target ('));
      assert.ok(html.includes('<circle'));
    });
  });

  describe('ColumnBars', () => {
    it('renders with empty buckets', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.ColumnBars, { buckets: [] })
      );
      assert.ok(html.includes('No aging bucket data available'));
    });

    it('renders with buckets and highlights 15+ bucket', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.ColumnBars, {
          buckets: [
            { key: '0-3', amount: 50000 },
            { key: '4-7', amount: 20000 },
            { key: '8-14', amount: 0 },
            { key: '15+', amount: 100000 },
          ],
        })
      );
      assert.ok(html.includes('role="img"'));
      assert.ok(html.includes('15+d'));
      assert.ok(html.includes('fill-[var(--chart-owes)]'));
    });
  });

  describe('StackedBar', () => {
    it('renders with empty items', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.StackedBar, { items: [] })
      );
      assert.ok(html.includes('role="img"'));
    });

    it('renders with status segments and legend', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.StackedBar, {
          items: [
            { key: 'accepted', label: 'Accepted', count: 10, amount: 2000000 },
            { key: 'pending', label: 'Pending', count: 2, amount: 300000 },
          ],
        })
      );
      assert.ok(html.includes('Accepted:'));
      assert.ok(html.includes('10 (₹20,000)'));
    });
  });

  describe('Sparkline', () => {
    it('renders decorative placeholder when data < 2 points', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.Sparkline, { data: [100] })
      );
      assert.ok(html.includes('aria-hidden="true"'));
    });

    it('renders SVG path with end dot when data is valid', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.Sparkline, { data: [50000, 30000, 0] })
      );
      assert.ok(html.includes('aria-hidden="true"'));
      assert.ok(html.includes('<svg'));
      assert.ok(html.includes('<path'));
      assert.ok(html.includes('<circle'));
    });
  });

  describe('ChartCard', () => {
    it('renders loading skeleton', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.ChartCard, { title: 'Test Card', loading: true })
      );
      assert.ok(html.includes('animate-[shimmer'));
    });

    it('renders error state', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.ChartCard, { title: 'Test Card', error: 'Failed to load' })
      );
      assert.ok(html.includes('Failed to load'));
    });

    it('renders empty state with message', () => {
      const html = renderToStaticMarkup(
        React.createElement(charts.ChartCard, {
          title: 'Test Card',
          empty: true,
          emptyMessage: 'No transactions found',
        })
      );
      assert.ok(html.includes('No transactions found'));
    });

    it('renders accessible data table button when tableData is provided', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          charts.ChartCard,
          {
            title: 'Test Card',
            tableData: {
              caption: 'Sample Table',
              headers: ['Name', 'Amount'],
              rows: [['Karan', '₹1,000']],
            },
          },
          React.createElement('div', null, 'Graphic chart child')
        )
      );
      assert.ok(html.includes('View chart data as table'));
      assert.ok(html.includes('Graphic chart child'));
    });
  });
});
