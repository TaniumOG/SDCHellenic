export type ScenarioPreset = 'conservative' | 'base' | 'aggressive';

export type Phase = {
  id: string;
  name: string;
  startDayBeforeEvent: number;
  endDayBeforeEvent: number;
  price: number;
  ticketCap?: number;
  baseDailyDemand: number;
};

export type EventInputs = {
  eventDate: string;
  totalCapacity: number;
  ticketsAlreadySold: number;
  saleStartDayBeforeEvent: number;
};

export type DemandControls = {
  priceSensitivity: number;
  urgencyStrength: number;
  marketingMultiplier: number;
  confidenceMultiplier: number;
  referencePrice: number;
};

export type Scenario = {
  id: string;
  name: string;
  preset: ScenarioPreset;
  event: EventInputs;
  demand: DemandControls;
  phases: Phase[];
};

export type PhaseResult = {
  phaseId: string;
  phaseName: string;
  durationDays: number;
  adjustedDailyDemand: number;
  ticketsSold: number;
  revenue: number;
  remainingCapacityAfter: number;
};

export type DailyPoint = {
  dayBeforeEvent: number;
  cumulativeTickets: number;
  cumulativeRevenue: number;
  remainingCapacity: number;
};

export type ScenarioResult = {
  scenarioId: string;
  totalTicketsSold: number;
  totalRevenue: number;
  avgTicketPrice: number;
  sellThroughPct: number;
  projectedSellOutDayBeforeEvent?: number;
  unsoldTickets: number;
  phaseResults: PhaseResult[];
  curve: DailyPoint[];
};

const clamp = (value: number, min = 0) => (value < min ? min : value);

export function simulateScenario(scenario: Scenario): ScenarioResult {
  const { event, demand } = scenario;
  const orderedPhases = [...scenario.phases].sort(
    (a, b) => b.startDayBeforeEvent - a.startDayBeforeEvent
  );

  let remainingCapacity = clamp(event.totalCapacity - event.ticketsAlreadySold);
  let cumulativeRevenue = 0;
  let cumulativeTickets = event.ticketsAlreadySold;

  const phaseResults: PhaseResult[] = [];
  const curve: DailyPoint[] = [
    {
      dayBeforeEvent: event.saleStartDayBeforeEvent,
      cumulativeTickets,
      cumulativeRevenue,
      remainingCapacity
    }
  ];

  for (const phase of orderedPhases) {
    if (remainingCapacity <= 0) {
      phaseResults.push({
        phaseId: phase.id,
        phaseName: phase.name,
        durationDays: 0,
        adjustedDailyDemand: 0,
        ticketsSold: 0,
        revenue: 0,
        remainingCapacityAfter: 0
      });
      continue;
    }

    const durationDays = Math.max(1, phase.startDayBeforeEvent - phase.endDayBeforeEvent + 1);
    const phaseMidpoint = (phase.startDayBeforeEvent + phase.endDayBeforeEvent) / 2;
    const urgencyProgress =
      1 - Math.min(1, phaseMidpoint / Math.max(event.saleStartDayBeforeEvent, 1));

    const urgencyFactor = 1 + demand.urgencyStrength * urgencyProgress;
    const priceEffect = Math.max(
      0.1,
      1 - demand.priceSensitivity * (phase.price - demand.referencePrice)
    );

    const adjustedDailyDemand =
      phase.baseDailyDemand *
      urgencyFactor *
      priceEffect *
      demand.marketingMultiplier *
      demand.confidenceMultiplier;

    const phaseDemand = durationDays * adjustedDailyDemand;
    const phaseCap = phase.ticketCap ?? remainingCapacity;
    const availableForPhase = Math.min(phaseCap, remainingCapacity);
    const ticketsSold = Math.min(phaseDemand, availableForPhase);
    const revenue = ticketsSold * phase.price;

    remainingCapacity -= ticketsSold;
    cumulativeRevenue += revenue;
    cumulativeTickets += ticketsSold;

    phaseResults.push({
      phaseId: phase.id,
      phaseName: phase.name,
      durationDays,
      adjustedDailyDemand,
      ticketsSold,
      revenue,
      remainingCapacityAfter: remainingCapacity
    });

    for (let day = phase.startDayBeforeEvent; day >= phase.endDayBeforeEvent; day -= 1) {
      const daysIntoPhase = phase.startDayBeforeEvent - day + 1;
      const phaseProgress = daysIntoPhase / durationDays;
      const phaseTickets = Math.min(ticketsSold, ticketsSold * phaseProgress);
      const phaseRevenue = phaseTickets * phase.price;
      const beforePhaseRevenue = cumulativeRevenue - revenue;
      const beforePhaseTickets = cumulativeTickets - ticketsSold;

      curve.push({
        dayBeforeEvent: day,
        cumulativeTickets: beforePhaseTickets + phaseTickets,
        cumulativeRevenue: beforePhaseRevenue + phaseRevenue,
        remainingCapacity: event.totalCapacity - (beforePhaseTickets + phaseTickets)
      });
    }
  }

  const sellThroughPct =
    ((event.totalCapacity - remainingCapacity) / Math.max(event.totalCapacity, 1)) * 100;
  const soldForRevenue = Math.max(cumulativeTickets - event.ticketsAlreadySold, 1);

  return {
    scenarioId: scenario.id,
    totalTicketsSold: cumulativeTickets,
    totalRevenue: cumulativeRevenue,
    avgTicketPrice: cumulativeRevenue / soldForRevenue,
    sellThroughPct,
    projectedSellOutDayBeforeEvent: remainingCapacity <= 0 ? curve.at(-1)?.dayBeforeEvent : undefined,
    unsoldTickets: remainingCapacity,
    phaseResults,
    curve: curve.sort((a, b) => b.dayBeforeEvent - a.dayBeforeEvent)
  };
}

export const defaultScenarios: Scenario[] = [
  {
    id: 'a',
    name: 'Scenario A — Fill Early',
    preset: 'base',
    event: {
      eventDate: '2026-10-03',
      totalCapacity: 7000,
      ticketsAlreadySold: 300,
      saleStartDayBeforeEvent: 120
    },
    demand: {
      priceSensitivity: 0.035,
      urgencyStrength: 0.75,
      marketingMultiplier: 1,
      confidenceMultiplier: 1,
      referencePrice: 15
    },
    phases: [
      { id: 'p1', name: 'Super Early Bird', startDayBeforeEvent: 120, endDayBeforeEvent: 91, price: 10, ticketCap: 1400, baseDailyDemand: 34 },
      { id: 'p2', name: 'Early Bird', startDayBeforeEvent: 90, endDayBeforeEvent: 61, price: 12, ticketCap: 1700, baseDailyDemand: 30 },
      { id: 'p3', name: 'Phase 1', startDayBeforeEvent: 60, endDayBeforeEvent: 36, price: 15, ticketCap: 1500, baseDailyDemand: 26 },
      { id: 'p4', name: 'Phase 2', startDayBeforeEvent: 35, endDayBeforeEvent: 15, price: 20, ticketCap: 1200, baseDailyDemand: 24 },
      { id: 'p5', name: 'Last Call + Gate', startDayBeforeEvent: 14, endDayBeforeEvent: 0, price: 30, baseDailyDemand: 42 }
    ]
  },
  {
    id: 'b',
    name: 'Scenario B — Balanced Ladder',
    preset: 'base',
    event: {
      eventDate: '2026-10-03',
      totalCapacity: 7000,
      ticketsAlreadySold: 300,
      saleStartDayBeforeEvent: 120
    },
    demand: {
      priceSensitivity: 0.03,
      urgencyStrength: 0.7,
      marketingMultiplier: 1,
      confidenceMultiplier: 1,
      referencePrice: 16
    },
    phases: [
      { id: 'b1', name: 'Super Early Bird', startDayBeforeEvent: 120, endDayBeforeEvent: 91, price: 12, ticketCap: 1200, baseDailyDemand: 30 },
      { id: 'b2', name: 'Early Bird', startDayBeforeEvent: 90, endDayBeforeEvent: 61, price: 14, ticketCap: 1400, baseDailyDemand: 28 },
      { id: 'b3', name: 'Phase 1', startDayBeforeEvent: 60, endDayBeforeEvent: 36, price: 17, ticketCap: 1500, baseDailyDemand: 26 },
      { id: 'b4', name: 'Phase 2', startDayBeforeEvent: 35, endDayBeforeEvent: 15, price: 22, ticketCap: 1300, baseDailyDemand: 22 },
      { id: 'b5', name: 'Last Call + Gate', startDayBeforeEvent: 14, endDayBeforeEvent: 0, price: 32, baseDailyDemand: 38 }
    ]
  }
];
