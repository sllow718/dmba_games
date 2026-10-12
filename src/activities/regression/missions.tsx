import type { ActivityDef, MissionDef } from "../../core/types";
import type { Listing } from "./data";
import { LISTINGS } from "./data";
import { predict, r2 } from "./engine";
import { ExploreFit, ExplorePredict } from "./explores";
import { FlatPlot, LESSON_FIT, LineMark, Plot, hasListingTag, sx, sy } from "./ui";

type Mission = MissionDef<Listing>;

const LABEL = "Recent sales · 12 flats · floor area and price";

// Everything quoted about the lesson line comes from the fitted line itself.
const SLOPE_K = Math.round(LESSON_FIT.slope * 10) / 10; // 4.9 ($k per sqm)
const SLOPE_D = Math.round(LESSON_FIT.slope * 10) * 100; // 4,900 ($ per sqm)
const INTERCEPT = Math.round(LESSON_FIT.intercept); // 108 ($k)
const R2 = Math.round(r2(LESSON_FIT, LISTINGS) * 100) / 100; // 0.96
const P90 = Math.round(predict(LESSON_FIT, 90) / 10) * 10; // 550 ($k)
const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const lineText = `price ≈ $${INTERCEPT}k + $${SLOPE_K}k × floor area`;

/** Two candidate lines through the lesson flats, for "which fits better?". */
function TwoLines() {
  const a = { intercept: 300, slope: 3 };
  return (
    <div className="kplot-wrap" style={{ maxWidth: 360 }}>
      <Plot label="Two lines through the 12 flats: line A is shallow and misses the big flats; line B follows the flats">
        <LineMark l={a} className="fitline mine" />
        <LineMark l={LESSON_FIT} className="fitline" />
        {LISTINGS.map((m) => <circle key={m.id} cx={sx(m.x)} cy={sy(m.y)} r={4.5} className="kp" fill="#2f74cc" />)}
        <text x={sx(140) - 4} y={sy(predict(a, 140)) + 14} textAnchor="end" className="line-tag a">A</text>
        <text x={sx(140) - 4} y={sy(predict(LESSON_FIT, 140)) - 6} textAnchor="end" className="line-tag b">B</text>
      </Plot>
    </div>
  );
}

const m1: Mission = {
  n: 1,
  title: "Fit the Line",
  concept: "The regression line",
  badge: "Line Fitter",
  data: LISTINGS,
  dataLabel: LABEL,
  brief: "Welcome to my agency. Buyers always ask what a flat should cost. Bigger flats cost more, but by how much? A straight line can tell us.",
  card: { formula: "predicted y = intercept + slope × x · least squares picks the line with the smallest total of squared residuals", example: lineText },
  review: {
    title: "A line through the data",
    what: (
      <>
        <p><b>Linear regression</b> draws the straight line that best follows the data. Here it predicts a flat's <b>price</b> (the outcome) from its <b>floor area</b> (the predictor).</p>
        <p>Unlike clustering, regression is <b>supervised</b>: we know the real prices of past flats and learn from them.</p>
      </>
    ),
    howHeading: ["How it works", "The regression line"],
    how: (
      <>
        <div className="formula">predicted price = intercept + slope × floor area</div>
        <ul>
          <li>The <b>slope</b> is how much the price goes up for each extra square metre.</li>
          <li>The <b>intercept</b> is where the line starts, at 0 sqm.</li>
          <li>A <b>residual</b> is the gap between a flat's real price and the line's prediction.</li>
        </ul>
        <p style={{ marginTop: 10 }}><b>Least squares</b> chooses the line whose residuals, squared and added up, are as small as possible.</p>
      </>
    ),
    exampleTitle: "Fitting a line to 12 recent sales",
    steps: [
      { text: "Each dot is a flat that sold recently: floor area across, price up.", eq: "12 flats", say: "Bigger flats clearly cost more." },
      { text: "Least squares draws the line that follows the dots best.", eq: lineText, say: "One straight line summarises all 12 sales.", highlight: { lit: ["all", "line"] } },
      { text: "The residuals are the vertical gaps between each flat and the line.", eq: "green: sold above the line · red: below", say: "Some flats sold for a bit more than the line predicts, some for a bit less.", highlight: { lit: ["all", "line", "resid"] } },
      { text: "Square each gap and add them up. Least squares makes that total as small as it can be.", eq: "no other straight line has a smaller total", say: "That's what makes it the best line.", highlight: { lit: ["all", "line", "resid"] } },
    ],
    remember: [
      "The regression line predicts the outcome (price) from a predictor (floor area).",
      "Slope: change in the prediction for each 1-unit increase in the predictor.",
      "A residual is actual minus predicted: positive above the line, negative below.",
      "Least squares picks the line with the smallest total of squared residuals.",
    ],
    says: ["First, what regression is for.", "Two numbers describe a line: slope and intercept.", "Here's the line through my recent sales.", "Now try fitting one yourself."],
  },
  explore: { goal: "Fit a line by eye, look at the gaps, then compare with least squares.", Component: ExploreFit },
  questions: [
    {
      id: "r1-line", type: "mc", prompt: "What does the regression line show?", layout: "list",
      options: [
        { text: "The exact price of every flat", hint: "Most flats sit a little above or below the line." },
        { text: "The predicted price for each floor area", correct: true },
        { text: "The most expensive flats", hint: "The line runs through the middle of the flats, not along the top." },
        { text: "Which flats are the same size", hint: "The line is about how price changes with size." },
      ],
      ladder: ["The line runs through the middle of the dots.", "Read up from a floor area to the line: what do you get?"],
      explain: "The line gives the predicted price for any floor area. Real prices sit a little above or below it.",
      highlight: { lit: ["all", "line"] },
    },
    {
      id: "r1-resid", type: "mc", prompt: "What is a residual?", layout: "list",
      options: [
        { text: "The slope of the line", hint: "The slope describes the line. A residual belongs to one flat." },
        { text: "A flat that doesn't fit the pattern", hint: "Every flat has a residual, even ones close to the line." },
        { text: "The gap between a flat's real price and the line's prediction", correct: true },
        { text: "The average price of all flats", hint: "A residual is about one flat compared with the line." },
      ],
      ladder: ["Think of the vertical lines in the worked example.", "Real price minus predicted price."],
      explain: "A residual is actual minus predicted: how far a flat sits above or below the line.",
      highlight: { lit: ["all", "line", "resid"] },
    },
    {
      id: "r1-above", type: "tap", prompt: "Tap every flat that sold for more than the line predicts.", items: ["above"], need: "a price above the line",
      show: { lit: ["all", "line"] },
      ladder: ["Look for dots that sit above the line.", "Flats 1, 3, 5, 8, 10 and 12 are above the line."],
      explain: "These flats have positive residuals: they sold for more than the line predicts.",
      highlight: { lit: ["above", "line", "resid"] },
    },
    {
      id: "r1-best", type: "mc", prompt: "Which line fits the flats better?", figure: <TwoLines />,
      options: [
        { text: "Line A", hint: "Line A misses the big flats by a lot: they sit far above it." },
        { text: "Line B", correct: true },
      ],
      ladder: ["Picture the gaps between each dot and each line.", "Which line keeps the gaps small everywhere?"],
      explain: "Line B runs through the middle of the flats, so its gaps are small. Line A is too shallow and misses the bigger flats by a lot.",
    },
    {
      id: "r1-square", type: "mc", prompt: "Why does least squares square the residuals before adding them up?", layout: "list",
      options: [
        { text: "So that gaps above and below the line don't cancel out", correct: true },
        { text: "To make the numbers smaller", hint: "Squaring makes big gaps bigger, not smaller." },
        { text: "Because prices are in thousands", hint: "The units don't matter here. Think about positive and negative gaps." },
        { text: "So the line goes through the origin", hint: "The line can start anywhere: that's the intercept's job." },
      ],
      ladder: ["Residuals above the line are positive, below are negative.", "What happens if you add +30 and −30?"],
      explain: "Squaring makes every gap count as positive, so misses above and below can't cancel out. It also makes big misses count extra.",
    },
  ],
};

const m2: Mission = {
  n: 2,
  title: "Read the Model",
  concept: "Interpreting a regression",
  badge: "Price Predictor",
  data: LISTINGS,
  dataLabel: LABEL,
  brief: "Now I have a line. What do its numbers mean, how do I use it to price a flat, and when shouldn't I trust it?",
  card: { formula: "slope = change in y per unit of x · R² = share of the variation in y explained · don't predict outside the data", example: `+${money(SLOPE_D)} per sqm · R² = ${R2} · 90 sqm → about $${P90}k` },
  review: {
    title: "Slope, prediction and R²",
    what: (
      <>
        <p>A regression line is only useful if you can read it. Three things matter most: the <b>slope</b>, a <b>prediction</b> for a new case, and <b>R²</b>, how well the line fits.</p>
        <p style={{ color: "var(--sub)" }}>And one warning: a line only tells you about the range of data it was built from.</p>
      </>
    ),
    howHeading: ["How to read it", "My line, in plain words"],
    how: (
      <>
        <div className="formula">{lineText}</div>
        <table className="mini">
          <tbody>
            <tr><th scope="row">Slope ${SLOPE_K}k</th><td>Each extra square metre adds about {money(SLOPE_D)} to the predicted price.</td></tr>
            <tr><th scope="row">Intercept ${INTERCEPT}k</th><td>The predicted price at 0 sqm. No flat is that small, so don't read anything into it.</td></tr>
            <tr><th scope="row">R² = {R2}</th><td>Floor area explains about {Math.round(R2 * 100)}% of the differences in price. The flats sit close to the line.</td></tr>
          </tbody>
        </table>
      </>
    ),
    exampleTitle: "Pricing a 90 sqm flat",
    steps: [
      { text: "Find 90 sqm on the floor-area axis and go straight up to the line.", eq: "90 sqm → the line", say: "A buyer asks about a 90 sqm flat.", highlight: { lit: ["all", "line", "pred=90"] } },
      { text: "Read across to the price axis.", eq: `predicted price ≈ $${P90}k`, say: "That's my starting price for the conversation.", highlight: { lit: ["all", "line", "pred=90"] } },
      { text: "Check how well the line fits: the flats sit close to it.", eq: `R² = ${R2}`, say: "A high R², so I can trust this estimate reasonably well.", highlight: { lit: ["all", "line", "resid"] } },
      { text: "These sales run from 62 to 128 sqm. A 200 sqm penthouse is far outside that.", eq: "outside the data = extrapolation", say: "I wouldn't price a penthouse with this line." },
    ],
    remember: [
      `The slope is the change in prediction per unit: here about ${money(SLOPE_D)} per extra sqm.`,
      "To predict, go up from the predictor to the line and read across.",
      "R² runs from 0 to 1: the share of the variation in the outcome the line explains.",
      "Only trust predictions inside the range of the data. Outside it is extrapolation.",
    ],
    says: ["Time to put the line to work.", "Three numbers, in plain words.", "Let's price a flat.", "Now try predicting yourself."],
  },
  explore: { goal: "Predict prices with the line, step outside the data, and compare a tidy and a noisy market.", Component: ExplorePredict },
  questions: [
    {
      id: "r2-slope", type: "mc", prompt: `The slope is $${SLOPE_K}k per sqm. What does that mean?`, layout: "list",
      options: [
        { text: `Every flat costs $${SLOPE_K}k`, hint: "The slope is about the change in price, not the price itself." },
        { text: `Each extra square metre adds about ${money(SLOPE_D)} to the predicted price`, correct: true },
        { text: `${SLOPE_K}% of flats are big`, hint: "The slope compares price with floor area." },
        { text: `A flat of 1 sqm costs $${SLOPE_K}k`, hint: "That would also need the intercept. The slope is the change per square metre." },
      ],
      ladder: ["Slope is rise over run.", "How much does the predicted price go up for 1 more sqm?"],
      explain: `For each extra square metre, the predicted price rises by about ${money(SLOPE_D)}.`,
    },
    {
      id: "r2-predict", type: "mc", prompt: "Use the chart. What price does the line predict for a 90 sqm flat?", figure: <FlatPlot data={LISTINGS} highlight={{ lit: ["all", "line", "pred=90"] }} />,
      options: [
        { text: `About $${P90 - 100}k`, hint: "Read across from where the dashed line meets the regression line." },
        { text: `About $${P90}k`, correct: true },
        { text: `About $${P90 + 100}k`, hint: "That's too high. Follow the dashed line across to the price axis." },
        { text: "About $90k", hint: "90 is the floor area, not the price." },
      ],
      ladder: ["Go up from 90 sqm to the line.", "Then read across to the price axis."],
      explain: `Up from 90 sqm to the line, then across: about $${P90}k.`,
    },
    {
      id: "r2-intercept", type: "mc", prompt: `The intercept is $${INTERCEPT}k. Should the agent tell buyers a 0 sqm flat costs $${INTERCEPT}k?`, layout: "list",
      options: [
        { text: "Yes, that's what the model says", hint: "The model was only built from flats between 62 and 128 sqm." },
        { text: "No: no flat is 0 sqm, so the intercept just sets where the line starts", correct: true },
        { text: "Only if R² is high", hint: "Even a perfect fit says nothing about flats far outside the data." },
      ],
      ladder: ["Is there any flat near 0 sqm in the data?", "Reading the line far outside the data is extrapolation."],
      explain: "The intercept positions the line. It isn't a real price, because no flat is anywhere near 0 sqm.",
    },
    {
      id: "r2-r2", type: "mc", prompt: `R² for the 12 flats is ${R2}. What does that tell you?`, layout: "list",
      options: [
        { text: `${Math.round(R2 * 100)}% of the flats are on the line`, hint: "Almost no flat is exactly on the line. R² is about how much of the variation is explained." },
        { text: `Floor area explains about ${Math.round(R2 * 100)}% of the differences in price`, correct: true },
        { text: `Prices go up ${R2}k per sqm`, hint: "That's what the slope tells you." },
        { text: "The model is wrong 4% of the time", hint: "R² isn't an error rate. It's the share of variation explained." },
      ],
      ladder: ["R² runs from 0 to 1.", "Close to 1 means the dots sit close to the line."],
      explain: `R² = ${R2}: floor area explains about ${Math.round(R2 * 100)}% of the differences in price, so the flats sit close to the line.`,
      highlight: { lit: ["all", "line", "resid"] },
    },
    {
      id: "r2-noisy", type: "mc", prompt: "In another area, the same kind of line has R² = 0.45. What should the agent conclude?", layout: "list",
      options: [
        { text: "The line is useless and should be ignored", hint: "It still captures the trend. It's just less precise." },
        { text: "Prices there rise faster with size", hint: "R² says nothing about how steep the line is." },
        { text: "Floor area explains less of the price there, so single predictions are less reliable", correct: true },
      ],
      ladder: ["Lower R² means the dots are more spread out around the line.", "Spread-out dots mean bigger misses for individual flats."],
      explain: "With R² = 0.45, other things matter a lot too, like location or age. The trend is still there, but expect bigger misses.",
    },
    {
      id: "r2-extrapolate", type: "mc", prompt: "A client wants a price for a 200 sqm penthouse. The data runs from 62 to 128 sqm. What's the problem?", layout: "list",
      options: [
        { text: "None: just read the line at 200 sqm", hint: "The line has never seen a flat that big." },
        { text: "The slope would be negative", hint: "The slope stays the same. The issue is where the data comes from." },
        { text: "200 sqm is outside the data, so the prediction is a guess", correct: true },
        { text: "The intercept is too small", hint: "Think about the range of floor areas the line was built from." },
      ],
      ladder: ["Where did the line learn from?", "62 to 128 sqm. 200 is far beyond that."],
      explain: "Predicting outside the range of the data is extrapolation. Penthouses may follow a different pattern altogether.",
    },
  ],
};

export const pricePredictor: ActivityDef<Listing> = {
  id: "price-predictor",
  shop: "Property Agent",
  title: "Price Predictor",
  topic: "Linear regression",
  summary: "Fit a straight line to flat prices, then read its slope, predictions and R², and know when not to trust it.",
  theme: {
    owner: { name: "Ms Wong", initials: "MW" },
    stop: "Mission",
    rows: ["flat", "flats"],
    intro: "Linear regression at Ms Wong's property agency. Each mission is a quick review, a hands-on activity and a checkpoint.",
    finale: "That's both missions done. You can fit a line, read it and know when not to trust it. My clients are in good hands.",
  },
  view: { Grid: FlatPlot, has: hasListingTag },
  missions: [m1, m2],
};
