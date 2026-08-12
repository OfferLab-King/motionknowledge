export const visualFixtures: Readonly<Record<string, unknown>> = {
  'title-hero': {
    title: 'What is a Discounted Cash Flow?',
    subtitle: 'A beginner-friendly explanation of how to value an investment',
    kicker: 'Finance fundamentals',
  },
  'section-intro': {
    title: 'Step by step, we will cover',
    kicker: 'In this section',
    bullets: ['What a cash flow is', 'How discounting works', 'The formula, in plain terms'],
  },
  'quote': {
    text: 'A dollar today is worth more than a dollar tomorrow.',
    attribution: 'Core finance principle',
  },
  'key-takeaway': {
    title: 'Key takeaway',
    text: 'DCF values a future stream of cash flows in today\u2019s money.',
  },
  'summary': {
    title: 'Summary',
    points: [
      'DCF discounts future cash flows',
      'The discount rate reflects risk and time',
      'Compare the result with the price today',
      'It is a model, not a guarantee',
    ],
  },
  'outro': {
    title: 'Thanks for watching',
    tagline: 'Keep building your finance foundation',
  },
  'definition-card': {
    term: 'Discounted Cash Flow',
    definition:
      'A method that estimates what future money is worth today by applying a discount rate.',
    example: 'Receiving $110 next year is worth less than $110 today.',
  },
  'bullet-reveal': {
    title: 'Why cash flow matters',
    bullets: ['Cash pays bills', 'Cash can be reinvested', 'Cash is measurable'],
  },
  'comparison': {
    title: 'Two ways to compare',
    items: [
      {name: 'Present value', value: 'What future money is worth today'},
      {name: 'Future value', value: 'What today\u2019s money grows to'},
    ],
  },
  'pros-cons': {
    title: 'Using DCF: trade-offs',
    pros: ['Makes assumptions explicit', 'Grounds value in cash flows'],
    cons: ['Sensitive to assumptions', 'Needs reliable forecasts'],
  },
  'timeline': {
    title: 'From idea to value',
    events: [
      {label: 'Forecast cash flows', caption: 'years 1 to 5'},
      {label: 'Choose a discount rate', caption: 'risk and time'},
      {label: 'Discount and sum', caption: 'present value'},
    ],
  },
  'cashflow-timeline': {
    title: 'Expected cash flows',
    periods: [
      {year: 0, label: 'Year 0', amount: -100, displayAmount: '−$100', type: 'outflow'},
      {year: 1, label: 'Year 1', amount: 30, displayAmount: '$30', type: 'inflow'},
      {year: 2, label: 'Year 2', amount: 40, displayAmount: '$40', type: 'inflow'},
      {year: 3, label: 'Year 3', amount: 50, displayAmount: '$50', type: 'inflow'},
    ],
  },
  'process-flow': {
    title: 'The DCF pipeline',
    steps: ['Forecast', 'Discount', 'Sum', 'Compare'],
  },
  'flow-chart': {
    title: 'Decision flow',
    steps: ['Estimate cash flows', 'Is the forecast reliable?', 'Apply the discount rate', 'Accept if value exceeds cost'],
    branchLabels: ['yes', 'no'],
  },
  'before-after': {
    title: 'Before / after discounting',
    before: 'A future $110 looks like $110 at face value.',
    after: 'Discounted at 10%, it is worth $100 in today\u2019s terms.',
  },
  'bar-chart': {
    title: 'Cash flows by year',
    series: [
      {label: 'Y0', value: -100},
      {label: 'Y1', value: 30},
      {label: 'Y2', value: 40},
      {label: 'Y3', value: 50},
    ],
    unit: '',
  },
  'line-chart': {
    title: 'Present value vs discount rate',
    series: [
      {label: '5%', value: 106},
      {label: '8%', value: 100},
      {label: '10%', value: 96},
      {label: '15%', value: 87},
      {label: '20%', value: 79},
    ],
  },
  'area-chart': {
    title: 'Cumulative discounted value',
    series: [
      {label: 'Y1', value: 27},
      {label: 'Y2', value: 60},
      {label: 'Y3', value: 98},
    ],
  },
  'donut-chart': {
    title: 'Portfolio mix',
    slices: [
      {label: 'Equities', value: 50},
      {label: 'Bonds', value: 30},
      {label: 'Cash', value: 20},
    ],
  },
  'data-table': {
    title: 'Present value calculation',
    headers: ['Year', 'Cash flow', 'Discount factor', 'Present value'],
    rows: [
      ['1', '$30', '0.909', '$27.27'],
      ['2', '$40', '0.826', '$33.06'],
      ['3', '$50', '0.751', '$37.57'],
    ],
  },
  'number-counter': {
    title: 'Estimated present value',
    value: 98,
    unit: '',
    caption: 'of the three future cash flows',
  },
  'formula': {
    title: 'The discount formula',
    formula: 'PV = CF / (1 + r)^t',
    description: 'Present value of a cash flow CF discounted at rate r for t years',
  },
  'formula-derivation': {
    title: 'Deriving present value',
    steps: ['PV x (1 + r)^t = CF', 'PV = CF / (1 + r)^t'],
    conclusion: 'Discounting is compounding in reverse',
  },
  'equation-highlight': {
    equation: 'PV = CF / (1 + r)^t',
    highlights: ['CF: the future cash flow', 'r: the discount rate', 't: years into the future'],
    caption: 'Each piece has a clear meaning',
  },
  'step-by-step-calculation': {
    title: 'Present value, step by step',
    steps: [
      {expression: 'PV₁ = $30 / 1.10', result: '$27.27'},
      {expression: 'PV₂ = $40 / 1.10²', result: '$33.06'},
      {expression: 'PV₃ = $50 / 1.10³', result: '$37.57'},
    ],
    conclusion: 'Total present value ≈ $97.90',
  },
  'code-block': {
    title: 'Discounting in code',
    language: 'python',
    code: 'def present_value(cf, rate, years):\n    return cf / (1 + rate) ** years',
  },
  'terminal-demo': {
    title: 'zsh',
    lines: [
      {prompt: true, text: 'dcf --rate 0.10 --flows 30,40,50'},
      {prompt: false, text: 'present value: $97.90'},
    ],
  },
  'browser-frame': {
    title: 'Investment analyzer',
    url: 'https://app.example.com/analyze',
    caption: 'The same math, in a tool',
  },
  'screenshot-callout': {
    title: 'Analytics dashboard',
    caption: 'Every figure traces back to the cash-flow forecast.',
    callouts: ['Forecast table', 'Discount-rate input', 'Result card'],
  },
  'relationship-diagram': {
    title: 'What DCF connects',
    subject: 'DCF',
    related: [
      {label: 'Forecasts', relation: 'uses'},
      {label: 'Risk', relation: 'reflects'},
      {label: 'Time', relation: 'depends on'},
      {label: 'Value', relation: 'produces'},
    ],
  },
  'network-diagram': {
    title: 'The finance stack',
    nodes: [
      {label: 'DCF', group: 0},
      {label: 'WACC', group: 1},
      {label: 'Forecasts', group: 2},
      {label: 'Terminal value', group: 2},
      {label: 'Risk', group: 1},
      {label: 'NPV', group: 0},
    ],
  },
  'matrix': {
    title: 'Time vs uncertainty',
    quadrants: [
      {label: 'Forecastable', description: 'Short horizon, low uncertainty'},
      {label: 'Risky', description: 'Long horizon, high uncertainty'},
      {label: 'Stable', description: 'Short horizon, high certainty'},
      {label: 'Speculative', description: 'Long horizon, uncertain'},
    ],
  },
  'pyramid': {
    title: 'From inputs to decision',
    layers: [
      {label: 'Investment decision', caption: ''},
      {label: 'Net present value', caption: ''},
      {label: 'Cash-flow forecasts', caption: ''},
      {label: 'Assumptions', caption: ''},
    ],
  },
  'funnel': {
    title: 'Forecast to value',
    stages: [
      {label: 'Revenue', value: '100'},
      {label: 'After costs', value: '55'},
      {label: 'After tax', value: '40'},
      {label: 'Discounted', value: '32'},
    ],
  },
  'quiz-question': {
    question: 'If the discount rate increases, the present value of a future cash flow…',
    options: ['Decreases', 'Increases', 'Stays the same', 'Doubles'],
  },
  'quiz-answer': {
    question: 'If the discount rate increases, the present value…',
    correct: 'Decreases',
    explanation: 'A higher discount rate means we weigh future money less heavily.',
  },
};
