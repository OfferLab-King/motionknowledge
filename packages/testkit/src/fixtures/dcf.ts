import {
  dcfClaims,
  dcfLessonPlan,
  dcfScript,
  dcfStoryboard,
  dcfSources,
  MockProvider,
} from '@motionknowledge/providers';
import type {Storyboard, Scene} from '@motionknowledge/schemas';

export {dcfClaims, dcfLessonPlan, dcfScript, dcfSources};

export function dcfStoryboardFixture(): Storyboard {
  const storyboard = dcfStoryboard() as unknown as Storyboard;
  return storyboard;
}

export const DCF_TOPIC = 'What is a Discounted Cash Flow?';

export const DCF_SOURCE_TEXT = [
  'Discounted cash flow (DCF) is a valuation method that estimates the value of an investment from its expected future cash flows.',
  'Money received in the future is worth less than the same amount today because it cannot earn returns in the meantime: this is the time value of money.',
  'The present value of a single cash flow is the cash flow divided by (1 + discount rate) raised to the number of years.',
  'A higher discount rate produces a lower present value. The discount rate reflects both risk and time.',
  'When the present value of expected cash flows exceeds the cost today, the investment may be worth considering. DCF is an estimate, not a guarantee.',
  'This primer is educational material and not investment advice.',
].join(' ');

export function makeMockProviders() {
  return {llm: new MockProvider(), tts: new MockProvider()};
}
