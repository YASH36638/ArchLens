import type {
  ReportCounts,
  ReportSummaryDto,
  ScoreBreakdown,
  Smell,
  SmellDefinitionDto,
} from '@archlens/shared-types';

export interface AssessmentRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  action: string;
  relatedPath?: string;
  metric?: string;
}

const METRIC_ACTIONS: Record<
  keyof Omit<ScoreBreakdown, 'overall' | 'measurementNotes' | 'derivation'>,
  { title: string; action: string }
> = {
  complexity: {
    title: 'Reduce cyclomatic complexity',
    action:
      'Extract nested conditionals into named helpers, split long methods, and prefer early returns over deep nesting.',
  },
  duplication: {
    title: 'Eliminate duplicated code',
    action:
      'Consolidate copy-pasted blocks into shared utilities or base modules; re-run the scan after deduplication.',
  },
  coupling: {
    title: 'Loosen module coupling',
    action:
      'Introduce interfaces or facades between hot modules, break dependency cycles, and invert ownership of shared types.',
  },
  cohesion: {
    title: 'Improve module cohesion',
    action:
      'Group related functions/types into focused modules and move unrelated helpers out of overloaded packages.',
  },
  smells: {
    title: 'Clear architecture smells',
    action:
      'Triage top smells by severity, fix god classes and large files first, then re-scan to confirm the score lift.',
  },
};

function priorityForScore(score: number): 'high' | 'medium' | 'low' {
  if (score < 50) return 'high';
  if (score < 70) return 'medium';
  return 'low';
}

export function buildAssessmentRecommendations(
  summary: ReportSummaryDto,
  smellCatalog: ReadonlyArray<SmellDefinitionDto> = []
): AssessmentRecommendation[] {
  const recommendations: AssessmentRecommendation[] = [];
  const catalogByRule = new Map(smellCatalog.map((s) => [s.ruleId, s]));
  const sb = summary.scoreBreakdown;

  const metricEntries = (
    [
      ['complexity', sb.complexity],
      ['duplication', sb.duplication],
      ['coupling', sb.coupling],
      ['cohesion', sb.cohesion],
      ['smells', sb.smells],
    ] as const
  )
    .slice()
    .sort((a, b) => a[1] - b[1]);

  for (const [metric, score] of metricEntries) {
    if (score >= 80) continue;
    const template = METRIC_ACTIONS[metric];
    recommendations.push({
      id: `metric-${metric}`,
      priority: priorityForScore(score),
      title: template.title,
      reason: `${metric[0]!.toUpperCase()}${metric.slice(1)} scored ${Math.round(score)}/100 on the latest scan.`,
      action: template.action,
      metric,
    });
  }

  const topSmells: Smell[] = summary.topSmells?.slice(0, 5) ?? [];
  for (const smell of topSmells) {
    const def = catalogByRule.get(smell.ruleId) ?? catalogByRule.get(smell.kind);
    recommendations.push({
      id: `smell-${smell.id}`,
      priority: smell.severity === 'critical' || smell.severity === 'major' ? 'high' : 'medium',
      title: def?.name ?? smell.kind,
      reason:
        def?.shortDescription ?? `${smell.kind} detected${smell.file ? ` in ${smell.file}` : ''}.`,
      action:
        def?.remediation ?? 'Inspect the flagged location and apply the smallest safe refactor.',
      relatedPath: smell.file,
    });
  }

  if (summary.cycles && summary.cycles.length > 0) {
    const first = summary.cycles[0]!;
    const path =
      first.representativePathNames?.join(' → ') ?? first.moduleNames.slice(0, 4).join(' → ');
    recommendations.push({
      id: 'cycles',
      priority: 'high',
      title: 'Break dependency cycles',
      reason: `${summary.cycles.length} circular dependency chain${summary.cycles.length === 1 ? '' : 's'} detected.`,
      action: `Start with: ${path}. Extract a shared contract or invert one edge to open the loop.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'healthy',
      priority: 'low',
      title: 'Keep architecture healthy',
      reason: `Overall score is ${Math.round(sb.overall)}/100 with no urgent metric gaps.`,
      action:
        'Maintain PR hygiene, re-scan after larger refactors, and watch hotspot modules for complexity creep.',
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return recommendations.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 8);
}

export interface DashboardRepoSnapshot {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  scanId: string | null;
  scanStatus: string | null;
  overall: number | null;
  breakdown: ScoreBreakdown | null;
  counts: ReportCounts | null;
  topSmellKinds: string[];
  updatedAt: string | null;
}

export function answerDashboardChat(
  question: string,
  repos: ReadonlyArray<DashboardRepoSnapshot>
): string {
  const q = question.trim().toLowerCase();
  const scanned = repos.filter((r) => r.overall !== null);
  const pending = repos.filter((r) => r.scanStatus && r.scanStatus !== 'completed');
  const unscanned = repos.filter((r) => !r.scanId);

  if (repos.length === 0) {
    return 'No repositories are connected yet. Open Integrations and connect a GitHub repo to start scanning.';
  }

  if (/help|what can|how (do|can)|commands/.test(q)) {
    return [
      'I can help with your scanned repositories. Try:',
      '• “Which repo needs attention?”',
      '• “What should I fix first?”',
      '• “Compare my scores”',
      '• “Explain [repo name]”',
      'Or click Assessment (i) on a card for AI-recommended changes.',
    ].join('\n');
  }

  if (/attention|worst|lowest|weak|risk|fix first|priority/.test(q)) {
    if (scanned.length === 0) {
      return pending.length
        ? `No completed scores yet. ${pending.length} scan${pending.length === 1 ? ' is' : 's are'} still running — wait for completion, then ask again.`
        : 'None of your repos have a completed scan. Open a repo and click Re-scan.';
    }
    const sorted = [...scanned].sort((a, b) => (a.overall ?? 100) - (b.overall ?? 100));
    const worst = sorted[0]!;
    const weakMetrics = worst.breakdown
      ? (
          [
            ['complexity', worst.breakdown.complexity],
            ['duplication', worst.breakdown.duplication],
            ['coupling', worst.breakdown.coupling],
            ['cohesion', worst.breakdown.cohesion],
            ['smells', worst.breakdown.smells],
          ] as const
        )
          .filter(([, s]) => s < 70)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 3)
          .map(([m, s]) => `${m} ${Math.round(s)}`)
          .join(', ')
      : '';
    const smellHint =
      worst.topSmellKinds.length > 0
        ? ` Top smells: ${worst.topSmellKinds.slice(0, 3).join(', ')}.`
        : '';
    return `**${worst.fullName}** needs the most attention at **${Math.round(worst.overall!)}/100**.${
      weakMetrics ? ` Weakest areas: ${weakMetrics}.` : ''
    }${smellHint} Open Assessment (i) on that card for concrete change recommendations.`;
  }

  if (/compare|rank|leaderboard|all scores|scores/.test(q)) {
    if (scanned.length === 0) return 'No scored repositories yet — complete a scan first.';
    const lines = [...scanned]
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
      .map((r, i) => `${i + 1}. **${r.fullName}** — ${Math.round(r.overall!)}/100`);
    return ['Current ranking:', ...lines].join('\n');
  }

  if (/smell|smell|debt|issue/.test(q)) {
    const withSmells = scanned
      .filter((r) => (r.counts?.smells ?? 0) > 0 || r.topSmellKinds.length > 0)
      .sort((a, b) => (b.counts?.smells ?? 0) - (a.counts?.smells ?? 0));
    if (withSmells.length === 0) {
      return scanned.length
        ? 'Completed scans do not report open smell counts right now. Open a repo overview to inspect smell details.'
        : 'Scan a repository first to surface architecture smells.';
    }
    return withSmells
      .slice(0, 4)
      .map((r) => {
        const count = r.counts?.smells ?? r.topSmellKinds.length;
        const kinds = r.topSmellKinds.slice(0, 3).join(', ');
        return `• **${r.fullName}**: ${count} smell${count === 1 ? '' : 's'}${kinds ? ` (${kinds})` : ''}`;
      })
      .join('\n');
  }

  const mentioned = repos.find(
    (r) =>
      q.includes(r.fullName.toLowerCase()) ||
      q.includes(r.name.toLowerCase()) ||
      q.includes(`${r.owner}/${r.name}`.toLowerCase())
  );
  if (mentioned) {
    if (mentioned.overall === null) {
      return `**${mentioned.fullName}** is connected but has no completed score yet${
        mentioned.scanStatus ? ` (latest scan: ${mentioned.scanStatus})` : ''
      }. Open the repo and run a scan.`;
    }
    const sb = mentioned.breakdown;
    const metrics = sb
      ? `Complexity ${Math.round(sb.complexity)}, duplication ${Math.round(sb.duplication)}, coupling ${Math.round(sb.coupling)}, cohesion ${Math.round(sb.cohesion)}, smells ${Math.round(sb.smells)}.`
      : '';
    return [
      `**${mentioned.fullName}** scores **${Math.round(mentioned.overall)}/100**.`,
      metrics,
      mentioned.topSmellKinds.length
        ? `Notable smells: ${mentioned.topSmellKinds.slice(0, 4).join(', ')}.`
        : null,
      'Use the Assessment (i) button on the card for recommended changes.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (/scan|status|progress|waiting/.test(q)) {
    const bits: string[] = [];
    if (pending.length) {
      bits.push(
        `${pending.length} in progress: ${pending.map((r) => `${r.fullName} (${r.scanStatus})`).join(', ')}.`
      );
    }
    if (unscanned.length) {
      bits.push(
        `${unscanned.length} never scanned: ${unscanned.map((r) => r.fullName).join(', ')}.`
      );
    }
    if (scanned.length) {
      bits.push(`${scanned.length} completed with scores.`);
    }
    return bits.join(' ') || 'All connected repositories look idle — pick one and run Re-scan.';
  }

  const avg =
    scanned.length > 0
      ? Math.round(scanned.reduce((sum, r) => sum + (r.overall ?? 0), 0) / scanned.length)
      : null;

  return [
    `You're tracking **${repos.length}** repositor${repos.length === 1 ? 'y' : 'ies'}${
      avg !== null ? ` with an average score of **${avg}/100**` : ''
    }.`,
    pending.length ? `${pending.length} scan(s) still running.` : null,
    unscanned.length ? `${unscanned.length} not scanned yet.` : null,
    'Ask “which repo needs attention?” or click Assessment (i) on any scanned card.',
  ]
    .filter(Boolean)
    .join(' ');
}
