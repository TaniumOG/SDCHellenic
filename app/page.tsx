'use client';

import { useMemo, useState } from 'react';
import { LineChart } from '@/components/LineChart';
import { defaultScenarios, Scenario, simulateScenario } from '@/lib/simulator';

const currency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const number = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);

function updateScenario<T extends keyof Scenario>(
  scenarios: Scenario[],
  idx: number,
  key: T,
  value: Scenario[T]
) {
  return scenarios.map((scenario, i) => (i === idx ? { ...scenario, [key]: value } : scenario));
}

export default function Home() {
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = scenarios[activeIdx];

  const result = useMemo(() => simulateScenario(active), [active]);
  const compare = useMemo(
    () => scenarios.map((scenario) => ({ scenario, result: simulateScenario(scenario) })),
    [scenarios]
  );

  return (
    <main className="page">
      <header className="header glass">
        <p className="eyebrow">Pricing intelligence dashboard</p>
        <h1>Zimstock Pricing Scenario Simulator</h1>
        <p>
          Tune capacity, price ladders, and demand pressure to see how each scenario affects sell-through and
          projected revenue.
        </p>
      </header>

      <section className="tabs">
        {scenarios.map((scenario, idx) => (
          <button
            key={scenario.id}
            className={idx === activeIdx ? 'tab active' : 'tab'}
            onClick={() => setActiveIdx(idx)}
          >
            {scenario.name}
          </button>
        ))}
      </section>

      <section className="layout">
        <aside className="panel left glass">
          <h2>Event Inputs</h2>
          <label>
            Event Date
            <input
              type="date"
              value={active.event.eventDate}
              onChange={(e) =>
                setScenarios(
                  updateScenario(scenarios, activeIdx, 'event', {
                    ...active.event,
                    eventDate: e.target.value
                  })
                )
              }
            />
          </label>
          <label>
            Capacity
            <input
              type="number"
              value={active.event.totalCapacity}
              onChange={(e) =>
                setScenarios(
                  updateScenario(scenarios, activeIdx, 'event', {
                    ...active.event,
                    totalCapacity: Number(e.target.value)
                  })
                )
              }
            />
          </label>
          <label>
            Tickets Already Sold
            <input
              type="number"
              value={active.event.ticketsAlreadySold}
              onChange={(e) =>
                setScenarios(
                  updateScenario(scenarios, activeIdx, 'event', {
                    ...active.event,
                    ticketsAlreadySold: Number(e.target.value)
                  })
                )
              }
            />
          </label>

          <h2>Demand Controls</h2>
          <label>
            Price Sensitivity
            <input
              type="number"
              step="0.005"
              value={active.demand.priceSensitivity}
              onChange={(e) =>
                setScenarios(
                  updateScenario(scenarios, activeIdx, 'demand', {
                    ...active.demand,
                    priceSensitivity: Number(e.target.value)
                  })
                )
              }
            />
          </label>
          <label>
            Urgency Strength
            <input
              type="number"
              step="0.05"
              value={active.demand.urgencyStrength}
              onChange={(e) =>
                setScenarios(
                  updateScenario(scenarios, activeIdx, 'demand', {
                    ...active.demand,
                    urgencyStrength: Number(e.target.value)
                  })
                )
              }
            />
          </label>
          <label>
            Marketing Multiplier
            <input
              type="number"
              step="0.05"
              value={active.demand.marketingMultiplier}
              onChange={(e) =>
                setScenarios(
                  updateScenario(scenarios, activeIdx, 'demand', {
                    ...active.demand,
                    marketingMultiplier: Number(e.target.value)
                  })
                )
              }
            />
          </label>

          <h2>Pricing Phases</h2>
          <div className="phase-list">
            {active.phases.map((phase, pIdx) => (
              <div key={phase.id} className="phase-item">
                <strong>{phase.name}</strong>
                <label>
                  Price
                  <input
                    type="number"
                    value={phase.price}
                    onChange={(e) => {
                      const phases = active.phases.map((p, i) =>
                        i === pIdx ? { ...p, price: Number(e.target.value) } : p
                      );
                      setScenarios(updateScenario(scenarios, activeIdx, 'phases', phases));
                    }}
                  />
                </label>
                <label>
                  Cap
                  <input
                    type="number"
                    value={phase.ticketCap ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const phases = active.phases.map((p, i) =>
                        i === pIdx ? { ...p, ticketCap: raw === '' ? undefined : Number(raw) } : p
                      );
                      setScenarios(updateScenario(scenarios, activeIdx, 'phases', phases));
                    }}
                  />
                </label>
                <label>
                  Daily Demand
                  <input
                    type="number"
                    value={phase.baseDailyDemand}
                    onChange={(e) => {
                      const phases = active.phases.map((p, i) =>
                        i === pIdx ? { ...p, baseDailyDemand: Number(e.target.value) } : p
                      );
                      setScenarios(updateScenario(scenarios, activeIdx, 'phases', phases));
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </aside>

        <section className="panel right glass">
          <div className="kpis">
            <article>
              <h3>Projected Revenue</h3>
              <p>{currency(result.totalRevenue)}</p>
            </article>
            <article>
              <h3>Total Tickets Sold</h3>
              <p>{number(result.totalTicketsSold)}</p>
            </article>
            <article>
              <h3>Sell-through</h3>
              <p>{result.sellThroughPct.toFixed(1)}%</p>
            </article>
            <article>
              <h3>Average Ticket</h3>
              <p>{currency(result.avgTicketPrice)}</p>
            </article>
          </div>

          <div className="chart-stack">
            <section>
              <h2>Cumulative Revenue</h2>
              <LineChart points={result.curve} metric="cumulativeRevenue" color="#2dd4bf" />
            </section>
            <section>
              <h2>Cumulative Tickets</h2>
              <LineChart points={result.curve} metric="cumulativeTickets" color="#60a5fa" />
            </section>
            <section>
              <h2>Remaining Capacity</h2>
              <LineChart points={result.curve} metric="remainingCapacity" color="#fb923c" />
            </section>
          </div>

          <h2>Revenue by Phase</h2>
          <table>
            <thead>
              <tr>
                <th>Phase</th>
                <th>Tickets</th>
                <th>Revenue</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {result.phaseResults.map((phase) => (
                <tr key={phase.phaseId}>
                  <td>{phase.phaseName}</td>
                  <td>{number(phase.ticketsSold)}</td>
                  <td>{currency(phase.revenue)}</td>
                  <td>{number(phase.remainingCapacityAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Scenario Comparison</h2>
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Revenue</th>
                <th>Tickets</th>
                <th>Avg Ticket</th>
                <th>Unsold Risk</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(({ scenario, result: comparison }) => (
                <tr key={scenario.id}>
                  <td>{scenario.name}</td>
                  <td>{currency(comparison.totalRevenue)}</td>
                  <td>{number(comparison.totalTicketsSold)}</td>
                  <td>{currency(comparison.avgTicketPrice)}</td>
                  <td>{number(comparison.unsoldTickets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
