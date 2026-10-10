import type { ActivityDef, MissionDef } from "../../core/types";
import { Frac } from "../../components/ui";
import type { Applicant } from "./data";
import { TEST, TRAIN } from "./data";
import { has } from "./engine";
import { ExploreCut, ExploreGrow, ExploreImpurity, ExploreReadTree, ExplorePrune, ExploreSplits } from "./explores";
import { BANK_TREE, FULL_TREE } from "./trees";
import { Applicants, Tree } from "./ui";

type Mission = MissionDef<Applicant>;

const PAST = "Neighbourhood Bank · 12 past loans";
const NEW = "Neighbourhood Bank · 8 new applicants (test set)";
const good = "credit=Good", poor = "credit=Poor", repaid = "outcome=Repaid", defaulted = "outcome=Default";

const m1: Mission = {
  n: 1,
  title: "Read the Tree",
  concept: "Reading a decision tree",
  badge: "Tree Reader",
  data: TRAIN,
  dataLabel: PAST,
  brief: "Welcome to Neighbourhood Bank. Before you build a tree, learn to read one. This is the tree I use to decide who gets a loan.",
  card: { formula: "prediction = the majority outcome in the leaf you land in", example: "Ella: good credit → income $38k > 30 → leaf of 5 repaid → Repaid" },
  review: {
    title: "Roots, branches and leaves",
    what: (
      <>
        <p>A <b>decision tree</b> asks a series of yes/no questions about an applicant. The first question is the <b>root</b>. Each answer sends you down a <b>branch</b>.</p>
        <p>When there are no more questions you reach a <b>leaf</b>. The leaf holds the past loans that ended up there, and its prediction is their most common outcome.</p>
        <Tree node={BANK_TREE} />
      </>
    ),
    how: (
      <>
        <div className="formula">prediction = majority outcome in the leaf · confidence = <Frac top="majority count" bottom="loans in the leaf" /></div>
        <p>Start at the root. Answer its question for your applicant, follow that branch, and repeat until you reach a leaf. Yes goes left, no goes right.</p>
      </>
    ),
    exampleTitle: "Where does Ella go?",
    steps: [
      { text: <>Root: <b>Credit = Good?</b> Ella has good credit, so go down the yes branch.</>, eq: "yes →", say: "Six past applicants had good credit. Ella is one of them.", highlight: { lit: [good] } },
      { text: <>Next: <b>Income ≤ 30?</b> Ella earns $38k, so go down the no branch.</>, eq: "38 > 30 → no →", say: "Of the good-credit six, only Dev earned $30k or less.", highlight: { lit: [good], both: ["income>30"], only: true } },
      { text: "That's a leaf. All 5 past loans there were repaid.", eq: "predict Repaid · 5 of 5 = 100%", say: "So I'd lend to someone like Ella.", highlight: { lit: [good, "income>30"], both: [repaid] } },
    ],
    remember: [
      "The root is the first question. Leaves are where the questions end.",
      "Each leaf predicts the most common outcome of the past loans that landed in it.",
      "The share of that majority tells you how sure the leaf is: the poor-credit leaf is 5 of 6, about 83%.",
      "Every path from root to leaf reads as a rule: IF good credit AND income > 30 THEN Repaid.",
    ],
    says: ["First, the parts of a tree.", "Reading a tree is just answering questions in order.", "Let's follow one applicant down.", "Ready? Let's read some trees."],
  },
  explore: { goal: "Send three new applicants down Mr Lim's tree.", Component: ExploreReadTree },
  questions: [
    {
      id: "t1-hari", type: "mc", prompt: "Hari has poor credit and earns $31k. How many questions does the tree ask him?", figure: <Tree node={BANK_TREE} />,
      options: [
        { text: "0", hint: "Everyone answers the root question first." },
        { text: "1", correct: true },
        { text: "2", hint: "The income question is only on the good-credit branch." },
        { text: "3", hint: "This tree is never more than two questions deep." },
      ],
      ladder: ["Start at the root. Which way does poor credit go?", "Poor credit goes down the no branch, straight into a leaf."],
      explain: "Poor credit sends Hari down the no branch, which is already a leaf. One question.",
    },
    {
      id: "t1-new", type: "mc", prompt: "A new applicant has good credit and earns $25k. What does the tree predict?", figure: <Tree node={BANK_TREE} />,
      options: [
        { text: "Repaid", hint: "Good credit is only the first question. Check the income question too." },
        { text: "Default", correct: true },
      ],
      ladder: ["Good credit: go down the yes branch. Then answer the income question.", "$25k is 30 or less, so take the yes branch to the Default leaf."],
      explain: "Good credit → yes; $25k ≤ 30 → yes; that leaf predicts Default.",
      highlight: { lit: [good, "income<=30"] },
    },
    {
      id: "t1-sure", type: "num", kind: "proportion", prompt: "How sure is the poor-credit leaf? What share of its past loans defaulted?", answer: 5 / 6, figure: <Tree node={BANK_TREE} />,
      traps: [{ value: 1 / 6, hint: "That's the share who repaid. The leaf predicts Default." }, { value: 0.5, hint: "Divide by the 6 loans in that leaf, not all 12." }],
      first: "Count the loans in the poor-credit leaf, and how many of them defaulted.",
      ladder: ["The poor-credit leaf holds 6 past loans.", "5 of those 6 defaulted. So 5 ÷ 6 is…?"],
      explain: "5 ÷ 6 ≈ 83%. Mostly defaults, but Grace repaid, so the leaf isn't 100% sure.",
      highlight: { lit: [poor], both: [defaulted] },
    },
    {
      id: "t1-tap", type: "tap", prompt: "Tap every past applicant who lands in the Repaid leaf.", items: [good, "income>30"], need: "good credit and an income over $30k",
      ladder: ["The Repaid leaf is good credit, then income over 30.", "Aisha, Ben, Chloe, Ella and Farid all have good credit and earn over $30k."],
      explain: "Five applicants land there, and all five repaid.",
      highlight: { lit: [good, "income>30"] },
    },
    {
      id: "t1-rule", type: "mc", prompt: "Which rule does this tree contain?", layout: "list", figure: <Tree node={BANK_TREE} />,
      options: [
        { text: "IF income > 30 THEN Repaid", hint: "Income is only asked after good credit. Poor-credit applicants are declined at any income." },
        { text: "IF poor credit THEN Repaid", hint: "The poor-credit leaf predicts Default." },
        { text: "IF good credit AND income > 30 THEN Repaid", correct: true },
        { text: "IF good credit THEN Default", hint: "Most good-credit applicants land in the Repaid leaf." },
      ],
      ladder: ["A rule is one path from the root to a leaf.", "Follow yes, then no, to the green leaf. Which conditions did you pass?"],
      explain: "Each path is a rule. Yes to good credit and no to income ≤ 30 gives Repaid.",
    },
  ],
};

const m2: Mission = {
  n: 2,
  title: "Pure or Mixed?",
  concept: "Gini & entropy",
  badge: "Purity Inspector",
  data: TRAIN,
  dataLabel: PAST,
  brief: "A good leaf is one where everyone had the same outcome. I need a number for how mixed a group is.",
  card: { formula: "Gini = 1 − p₁² − p₂² · Entropy = −p₁ log₂ p₁ − p₂ log₂ p₂", example: "5 repaid, 1 defaulted: Gini 0.278, entropy 0.650" },
  review: {
    title: "Impurity: Gini and entropy",
    what: (
      <>
        <p>A group is <b>pure</b> when everyone in it had the same outcome. The more mixed it is, the higher its <b>impurity</b>.</p>
        <p>Trees try to end up with pure leaves, because a pure leaf makes a confident prediction.</p>
        <p style={{ color: "var(--sub)" }}>Two common measures: the <b>Gini index</b> and <b>entropy</b>.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">Gini = 1 − p<sub>repaid</sub>² − p<sub>default</sub>²</div>
        <div className="formula">Entropy = − p<sub>repaid</sub> log₂ p<sub>repaid</sub> − p<sub>default</sub> log₂ p<sub>default</sub></div>
        <p>p is the share of the group with that outcome. A pure group scores 0 on both. A 50/50 group scores the most: Gini 0.5, entropy 1. (Treat 0 × log₂ 0 as 0.)</p>
      </>
    ),
    exampleTitle: "Impurity of the good-credit group",
    steps: [
      { text: "Count the outcomes: 5 repaid, 1 defaulted, 6 in total.", eq: "p(repaid) = 5/6 · p(default) = 1/6", say: "Mostly repaid, with Dev the one default.", highlight: { lit: [good], both: [repaid] } },
      { text: "Gini: square each share, add them, subtract from 1.", eq: "1 − (5/6)² − (1/6)² = 1 − 0.694 − 0.028 = 0.278", say: "Low, because the group is mostly one outcome.", highlight: { lit: [good], both: [repaid] } },
      { text: "Entropy: multiply each share by its log₂, add, and flip the sign.", eq: "−(5/6)(−0.263) − (1/6)(−2.585) = 0.219 + 0.431 = 0.650", say: "Entropy runs from 0 to 1, so 0.65 is moderately mixed.", highlight: { lit: [good], both: [repaid] } },
    ],
    remember: [
      "Pure group: Gini 0 and entropy 0.",
      "Two outcomes split 50/50: Gini 0.5 and entropy 1, the most mixed possible.",
      "Gini and entropy rise and fall together. They rarely disagree on which group is purer.",
      "A tree wants splits that make its groups purer.",
    ],
    says: ["One idea: how mixed is a group?", "Two formulas that measure the same thing.", "Let's score my good-credit customers.", "Now you try."],
  },
  explore: { goal: "Build groups of applicants and watch their Gini and entropy.", Component: ExploreImpurity },
  questions: [
    {
      id: "t2-pure", type: "mc", prompt: "Which group is pure?", layout: "list",
      options: [
        { text: "Dev and Ella", hint: "Dev defaulted and Ella repaid. That's mixed." },
        { text: "Grace and Hari", hint: "Grace repaid and Hari defaulted." },
        { text: "Ivy and Aisha", hint: "Ivy defaulted and Aisha repaid." },
        { text: "Aisha, Ben and Chloe", correct: true },
      ],
      ladder: ["Pure means everyone in the group had the same outcome.", "Check the stamps on Aisha, Ben and Chloe."],
      explain: "Aisha, Ben and Chloe all repaid, so the group is pure: Gini 0, entropy 0.",
    },
    {
      id: "t2-root", type: "num", kind: "decimal", prompt: "All 12 past loans: 6 repaid, 6 defaulted. What is the Gini index?", answer: 0.5,
      traps: [{ value: 0, hint: "0 means pure. This group is as mixed as it gets." }, { value: 1, hint: "1 is the entropy of a 50/50 group. Gini tops out at 0.5." }],
      first: "Work out each share, square it, and subtract both squares from 1.",
      ladder: ["Each share is 6/12 = 0.5.", "1 − 0.5² − 0.5² = 1 − 0.25 − 0.25 = …?"],
      explain: "1 − 0.25 − 0.25 = 0.5, the highest Gini possible with two outcomes.",
      highlight: { lit: [repaid] },
    },
    {
      id: "t2-poor", type: "num", kind: "decimal", prompt: "Poor-credit group: 1 repaid, 5 defaulted. What is the Gini index?", answer: 10 / 36,
      traps: [{ value: 26 / 36, hint: "That's the sum of the squares. Subtract it from 1." }, { value: 5 / 6, hint: "That's the share who defaulted. Gini needs the squares." }],
      first: "Shares: 1/6 and 5/6. Square them, add, subtract from 1.",
      ladder: ["(1/6)² = 0.028 and (5/6)² = 0.694.", "1 − 0.028 − 0.694 = …?"],
      explain: "1 − 0.028 − 0.694 ≈ 0.278: the same as the good-credit group, just the other way round.",
      highlight: { lit: [poor], both: [defaulted] },
    },
    {
      id: "t2-ent", type: "num", kind: "decimal", prompt: "A group has 3 repaid and 1 defaulted. What is its entropy?", answer: 0.8113,
      traps: [{ value: 0.375, hint: "That's the Gini index. Entropy uses log₂." }, { value: 1, hint: "1 is for a 50/50 group. This one leans towards repaid." }],
      first: "Shares are 3/4 and 1/4. Entropy = −(3/4)log₂(3/4) − (1/4)log₂(1/4).",
      ladder: ["log₂(3/4) ≈ −0.415 and log₂(1/4) = −2.", "0.75 × 0.415 + 0.25 × 2 = 0.311 + 0.5 = …?"],
      explain: "0.311 + 0.5 ≈ 0.811. Fairly mixed, but not 50/50.",
    },
    {
      id: "t2-most", type: "mc", prompt: "Which group is the most mixed?", layout: "list",
      options: [
        { text: "5 repaid, 1 defaulted", hint: "That group leans clearly one way." },
        { text: "3 repaid, 3 defaulted", correct: true },
        { text: "4 repaid, 0 defaulted", hint: "That group is pure." },
        { text: "1 repaid, 3 defaulted", hint: "Leaning towards defaulted. Is any option an even split?" },
      ],
      ladder: ["The most mixed group has the outcomes as even as possible.", "Look for a 50/50 split."],
      explain: "3 and 3 is 50/50: Gini 0.5 and entropy 1, the most mixed possible.",
    },
  ],
};

const m3: Mission = {
  n: 3,
  title: "Pick the Best Question",
  concept: "Choosing a split",
  badge: "Question Picker",
  data: TRAIN,
  dataLabel: PAST,
  brief: "I could ask about credit, collateral or job first. Which question sorts my applicants best?",
  card: { formula: "drop = I(parent) − Σ (nᵢ ÷ n) × I(branchᵢ)", example: "Credit = Good?: Gini 0.5 − 0.278 = 0.222 · information gain 0.350" },
  review: {
    title: "Weighted impurity and information gain",
    what: (
      <>
        <p>To choose a question, try each one and see how pure the two branches become.</p>
        <p>Branches can be different sizes, so each branch counts in proportion to how many applicants it holds. That's the <b>weighted impurity</b>.</p>
        <p>The best question gives the <b>biggest drop</b> in impurity.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">weighted impurity = <Frac top="n yes" bottom="n" /> × I(yes) + <Frac top="n no" bottom="n" /> × I(no)</div>
        <div className="formula">drop = I(before) − weighted impurity</div>
        <p>I is Gini or entropy. With entropy, the drop is called <b>information gain</b>.</p>
      </>
    ),
    exampleTitle: "Score the question Collateral = Yes?",
    steps: [
      { text: "Split the 12 by collateral: 6 with, 6 without.", eq: "Yes: 4 ✓ 2 ✗ · No: 2 ✓ 4 ✗", say: "Outlined: the six with collateral. Green: the ones who repaid.", highlight: { lit: ["collateral=Yes"], both: [repaid] } },
      { text: "Gini of each branch.", eq: "1 − (4/6)² − (2/6)² = 0.444, both branches", say: "Both branches are still quite mixed.", highlight: { lit: ["collateral=Yes"], both: [repaid] } },
      { text: "Weight each branch by its size.", eq: "6/12 × 0.444 + 6/12 × 0.444 = 0.444", say: "Equal sizes, so each counts half.", highlight: { lit: ["collateral=Yes"], both: [repaid] } },
      { text: "Compare with the Gini before splitting.", eq: "drop = 0.5 − 0.444 = 0.056", say: "A small drop. Collateral doesn't help much.", highlight: { lit: ["collateral=Yes"], both: [repaid] } },
    ],
    remember: [
      "Score every possible question the same way, then pick the biggest drop.",
      "Weight each branch by its share of the applicants. Big branches count more.",
      "Information gain is the drop in entropy. Gini and entropy usually pick the same question.",
      "This greedy choice happens again at every node as the tree grows.",
    ],
    says: ["Before we start: how do we compare questions?", "Weight, then subtract.", "Let's score collateral.", "Now find the best question."],
  },
  explore: { goal: "Try each first question and find the one with the biggest impurity drop.", Component: ExploreSplits },
  questions: [
    {
      id: "t3-weighted", type: "num", kind: "decimal", prompt: "Credit = Good? splits the 12 into 5 ✓ 1 ✗ and 1 ✓ 5 ✗. Each branch has Gini 0.278. What is the weighted Gini?", answer: 10 / 36,
      traps: [{ value: 20 / 36, hint: "You added the two Ginis. Weight each by its share: 6/12." }, { value: 0.5, hint: "0.5 is the Gini before splitting." }],
      first: "Weighted Gini = 6/12 × 0.278 + 6/12 × 0.278.",
      ladder: ["Each branch holds 6 of the 12 applicants.", "0.5 × 0.278 + 0.5 × 0.278 = …?"],
      explain: "Half of 0.278 plus half of 0.278 is 0.278.",
      highlight: { lit: [good], both: [repaid] },
    },
    {
      id: "t3-drop", type: "num", kind: "decimal", prompt: "Gini before splitting is 0.5. What is the drop in Gini for Credit = Good?", answer: 0.5 - 10 / 36,
      traps: [{ value: 10 / 36, hint: "That's the Gini after splitting. The drop is before minus after." }],
      first: "Drop = Gini before − weighted Gini after.",
      ladder: ["Before: 0.5. After: 0.278.", "0.5 − 0.278 = …?"],
      explain: "0.5 − 0.278 = 0.222, four times the drop from collateral.",
    },
    {
      id: "t3-root", type: "mc", prompt: "Collateral drops Gini by 0.056. Credit drops it by 0.222. Which should be the root question?",
      options: [
        { text: "Collateral = Yes?", hint: "The best question has the bigger drop." },
        { text: "Credit = Good?", correct: true },
      ],
      ladder: ["The tree wants the purest branches.", "A bigger drop means purer branches."],
      explain: "Credit gives the bigger drop, so it goes at the root.",
    },
    {
      id: "t3-gain", type: "num", kind: "decimal", prompt: "Entropy before splitting is 1. After Credit = Good?, each branch has entropy 0.650. What is the information gain?", answer: 0.35,
      traps: [{ value: 0.65, hint: "That's the weighted entropy after the split. Subtract it from 1." }, { value: 1.3, hint: "Weight each branch by 6/12 before adding." }],
      first: "Information gain = entropy before − weighted entropy after.",
      ladder: ["Weighted entropy after = 6/12 × 0.650 + 6/12 × 0.650 = 0.650.", "1 − 0.650 = …?"],
      explain: "1 − 0.650 = 0.350. Entropy agrees with Gini: credit is the best first question.",
    },
    {
      id: "t3-why", type: "mc", prompt: "Why is each branch weighted by its size?", layout: "list",
      options: [
        { text: "Small branches are always pure", hint: "Not always. A branch of 3 can still be mixed." },
        { text: "So that Gini and entropy give the same number", hint: "They still give different numbers after weighting." },
        { text: "A big branch affects more applicants, so its purity matters more", correct: true },
        { text: "Because the root has to be pure", hint: "The root holds everyone and is usually mixed." },
      ],
      ladder: ["Imagine a split that puts 1 applicant on one side and 11 on the other.", "Should a pure branch of 1 count as much as a mixed branch of 11?"],
      explain: "Weighting stops a tiny pure branch from making a poor split look good.",
    },
  ],
};

const m4: Mission = {
  n: 4,
  title: "Where to Cut Income",
  concept: "Splitting on a number",
  badge: "Cut Finder",
  data: TRAIN,
  dataLabel: PAST,
  brief: "Income is a number, not a yes/no. Where should the tree draw the line?",
  card: { formula: "candidate cut = (xᵢ + xᵢ₊₁) ÷ 2 · keep the lowest weighted impurity", example: "Good credit: Income ≤ 30 → weighted Gini 0" },
  review: {
    title: "Numeric splits",
    what: (
      <>
        <p>For a number like income, the question becomes <b>Income ≤ c?</b> The tree has to choose the cut point c.</p>
        <p>Sort the applicants by income and only try cuts that fall <b>between neighbours</b>. Any cut inside the same gap gives the same two groups.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">candidate cut = <Frac top="lower income + next income" bottom="2" /></div>
        <p>Score each candidate cut like any other question, using weighted impurity. Keep the cut with the lowest.</p>
      </>
    ),
    exampleTitle: "Best income cut for the good-credit group",
    steps: [
      { text: "Sort the six good-credit applicants by income.", eq: "22 ✗ · 38 ✓ · 42 ✓ · 58 ✓ · 66 ✓ · 75 ✓", say: "Dev, the only default, earns the least.", highlight: { lit: [good] } },
      { text: "Find the halfway points between neighbours.", eq: "30 · 40 · 50 · 62 · 70.5", say: "Five gaps, so five candidate cuts.", highlight: { lit: [good] } },
      { text: <>Try <b>Income ≤ 40</b>: Dev and Ella against the other four.</>, eq: "2/6 × 0.5 + 4/6 × 0 = 0.167", say: "The low side mixes Dev and Ella.", highlight: { lit: [good], both: ["income<=40"] } },
      { text: <>Try <b>Income ≤ 30</b>: Dev alone against five who repaid.</>, eq: "1/6 × 0 + 5/6 × 0 = 0", say: "Both sides pure. That's the best possible cut.", highlight: { lit: [good], both: ["income<=30"] } },
    ],
    remember: [
      "With k different values there are k − 1 candidate cuts.",
      "Cuts go halfway between neighbouring values.",
      "A number can be cut again further down the tree, at a different point.",
      "Numeric cuts compete with yes/no questions. The biggest drop wins.",
    ],
    says: ["Numbers need a cut point.", "Halfway between neighbours, every time.", "Let's cut my good-credit customers.", "Over to you."],
  },
  explore: { goal: "Try income cuts in each credit group and find the best ones.", Component: ExploreCut },
  questions: [
    {
      id: "t4-cand", type: "mc", prompt: "The poor-credit incomes, sorted, are 28, 31, 47, 52, 66 and 84. Which of these is a candidate cut?",
      options: [
        { text: "60", hint: "Cuts go exactly halfway between two neighbours. 52 and 66 give 59." },
        { text: "75", correct: true },
        { text: "84", hint: "That's an income itself. Cuts go between incomes." },
        { text: "100", hint: "That's above everyone, so it doesn't divide the group." },
      ],
      ladder: ["Add two neighbouring incomes and halve the total.", "(66 + 84) ÷ 2 = …?"],
      explain: "(66 + 84) ÷ 2 = 75, halfway between Ivy and Grace.",
      highlight: { lit: [poor] },
    },
    {
      id: "t4-count", type: "num", kind: "count", prompt: "Six applicants with six different incomes. How many candidate cuts are there?", answer: 5,
      traps: [{ value: 6, hint: "Cuts sit between neighbours. Six values have one fewer gap." }],
      first: "Count the gaps between six sorted values.",
      ladder: ["Write six dots in a row. How many gaps between them?", "6 values → 6 − 1 gaps."],
      explain: "Six values leave five gaps, so five candidate cuts.",
    },
    {
      id: "t4-50", type: "num", kind: "decimal", prompt: "Good-credit group, Income ≤ 50: Dev ✗, Ella ✓, Ben ✓ on one side; Aisha, Farid, Chloe ✓ on the other. What is the weighted Gini?", answer: (3 / 6) * (4 / 9),
      traps: [{ value: 4 / 9, hint: "That's the Gini of the low side. Weight it by 3/6 and add the high side." }],
      first: "Gini of each side, then weight by 3/6 each.",
      ladder: ["Low side: 2 ✓ 1 ✗ → Gini 0.444. High side is pure → 0.", "3/6 × 0.444 + 3/6 × 0 = …?"],
      explain: "Half of 0.444 is 0.222. Better than not splitting, but not as good as cutting at 30.",
      highlight: { lit: [good], both: ["income<=50"] },
    },
    {
      id: "t4-best", type: "mc", prompt: "Which cut is best for the good-credit group?",
      options: [
        { text: "Income ≤ 70.5", hint: "That leaves Dev mixed in with four who repaid." },
        { text: "Income ≤ 50", hint: "Weighted Gini 0.222. Is there a cleaner cut?" },
        { text: "Income ≤ 40", hint: "That leaves Dev and Ella mixed together: weighted Gini 0.167." },
        { text: "Income ≤ 30", correct: true },
      ],
      ladder: ["The best cut has the lowest weighted Gini.", "Can any cut make both sides pure?"],
      explain: "Income ≤ 30 puts Dev alone and the five who repaid together: weighted Gini 0.",
      highlight: { lit: [good], both: ["income<=30"] },
    },
    {
      id: "t4-root", type: "mc", prompt: "Across all 12 applicants, the best income cut (≤ 34.5) has weighted Gini 0.333. Credit = Good? has 0.278. Which goes at the root?",
      options: [
        { text: "Income ≤ 34.5?", hint: "Lower weighted Gini is better. Compare 0.333 with 0.278." },
        { text: "Credit = Good?", correct: true },
      ],
      ladder: ["Numeric cuts compete with every other question.", "Pick the lower weighted Gini."],
      explain: "Credit has the lower weighted Gini, so it stays at the root. Income comes in one level down.",
    },
  ],
};

const m5: Mission = {
  n: 5,
  title: "Grow It, Stop It",
  concept: "Growing & overfitting",
  badge: "Tree Grower",
  data: TRAIN,
  dataLabel: PAST,
  brief: "Now grow a whole tree. But careful: a tree can learn my past customers so well it gets new ones wrong.",
  card: { formula: "grow: split the best question, repeat on each branch · stop: pure, too small or too deep", example: "Full tree: training 12/12, test 5/8" },
  review: {
    title: "Recursive partitioning",
    what: (
      <>
        <p>To grow a tree, split the root on its best question. Then treat each branch as a new group and find <b>its</b> best question. Repeat. This is <b>recursive partitioning</b>.</p>
        <p>If you keep going until every leaf is pure, the tree fits the training data perfectly. But it may learn one-off cases that won't happen again. That's <b>overfitting</b>.</p>
      </>
    ),
    how: (
      <>
        <p><b>Stopping rules</b>: stop splitting a node when</p>
        <ul>
          <li>it is already pure,</li>
          <li>a split would leave a leaf smaller than the <b>minimum leaf size</b>,</li>
          <li>the tree has reached its <b>maximum depth</b>, or</li>
          <li>no question reduces impurity.</li>
        </ul>
        <div className="formula" style={{ marginTop: 12 }}>accuracy = <Frac top="correct predictions" bottom="applicants" /> · check it on a <b>test set</b> the tree never saw</div>
      </>
    ),
    exampleTitle: "Growing Mr Lim's tree all the way",
    steps: [
      { text: <>Root: <b>Credit = Good?</b> is the best question.</>, eq: "5 ✓ 1 ✗ | 1 ✓ 5 ✗", say: "We worked this out at Counter 3.", highlight: { lit: [good], both: [repaid] } },
      { text: <>Good-credit branch: best question is <b>Income ≤ 30?</b></>, eq: "Dev ✗ | 5 ✓ → both pure", say: "That one makes sense: very low income, harder to repay.", highlight: { lit: [good], both: ["income<=30"] } },
      { text: <>Poor-credit branch: best question is <b>Income ≤ 75?</b></>, eq: "5 ✗ | Grace ✓ → both pure", say: "This split exists just for Grace. She was a one-off.", highlight: { lit: [poor], both: ["income>75"] } },
      { text: "Every leaf is pure. Now score it.", eq: "training 12/12 = 100% · test 5/8 = 62.5%", say: "Perfect on the past, poor on the new. That's overfitting." },
    ],
    remember: [
      "Recursive partitioning: split, then split each branch the same way.",
      "Pure leaves on the training data don't mean good predictions.",
      "Always judge a tree on a test set it hasn't seen.",
      "Stopping rules keep the tree small. A minimum leaf size of 2 would have refused the Grace split.",
    ],
    says: ["Time to grow a full tree.", "Know when to stop.", "Watch what happens to Grace.", "Your turn to grow one."],
  },
  explore: { goal: "Grow the tree until every leaf is pure, then compare it with a one-split tree.", Component: ExploreGrow },
  questions: [
    {
      id: "t5-next", type: "mc", prompt: "After the root split, what does the tree do with each branch?", layout: "list",
      options: [
        { text: "Asks the root question again", hint: "Everyone in a branch already gave the same answer to the root question." },
        { text: "Stops straight away", hint: "It only stops when a stopping rule says so." },
        { text: "Treats it as a new group and finds its best question", correct: true },
        { text: "Picks any question at random", hint: "Each split is chosen the same way as the root: biggest drop." },
      ],
      ladder: ["Think about the word recursive.", "The same process runs again inside each branch."],
      explain: "Each branch is split on its own best question, which is why it's called recursive partitioning.",
    },
    {
      id: "t5-rule", type: "mc", prompt: "Which of these is NOT a stopping rule?", layout: "list",
      options: [
        { text: "The leaf is pure", hint: "That's a stopping rule: a pure leaf can't get purer." },
        { text: "A split would leave fewer applicants than the minimum leaf size", hint: "That's the minimum leaf size rule." },
        { text: "The tree has reached its maximum depth", hint: "That's the maximum depth rule." },
        { text: "The leaf has more repaid than defaulted", correct: true },
      ],
      ladder: ["Stopping rules are about purity, size and depth.", "Which option is about the prediction instead?"],
      explain: "A leaf's majority decides its prediction, not whether to keep splitting.",
    },
    {
      id: "t5-over", type: "mc", prompt: "The full tree scores 12/12 on training and 5/8 on test. What is going on?", layout: "list",
      options: [
        { text: "The test set must contain mistakes", hint: "The test applicants are real outcomes. The tree is the problem." },
        { text: "Overfitting: it learnt one-off cases that don't hold for new applicants", correct: true },
        { text: "The tree is too small", hint: "It's grown as far as it can. A smaller tree does better on test." },
        { text: "Gini should have been entropy", hint: "Both measures grow the same tree here." },
      ],
      ladder: ["Compare how it does on loans it learnt from with loans it never saw.", "Which split was made for just one person?"],
      explain: "The Income ≤ 75 split fits Grace, a one-off. New high-income, poor-credit applicants default.",
    },
    {
      id: "t5-min", type: "mc", prompt: "With a minimum leaf size of 2, could the tree split Grace off on her own?",
      options: [
        { text: "Yes", hint: "Grace would be a leaf of one, below the minimum of 2." },
        { text: "No", correct: true },
      ],
      ladder: ["How many applicants would be in Grace's leaf?", "A leaf of 1 is smaller than 2."],
      explain: "A leaf of one breaks the minimum leaf size, so that split isn't allowed.",
      highlight: { lit: [poor], both: ["income>75"] },
    },
    {
      id: "t5-acc", type: "num", kind: "proportion", prompt: "The credit-only tree gets 6 of the 8 test applicants right. What is its test accuracy?", answer: 0.75,
      traps: [{ value: 0.5, hint: "Use the 8 test applicants, not the 12 past loans." }],
      first: "Accuracy = correct ÷ total.",
      ladder: ["6 right out of 8.", "6 ÷ 8 = …?"],
      explain: "6 ÷ 8 = 75%: better than the full tree's 62.5%, with just one question.",
    },
  ],
};

const m6: Mission = {
  n: 6,
  title: "Prune and Report",
  concept: "Pruning & the confusion matrix",
  badge: "Loan Officer",
  data: TEST,
  dataLabel: NEW,
  brief: "Last job: trim the tree so it works on new applicants, check its mistakes, and give me rules I can use at the counter.",
  card: { formula: "accuracy = (caught + cleared) ÷ total · prune branches that don't help on the test set", example: "Pruned tree: (4 + 3) ÷ 8 = 87.5%" },
  review: {
    title: "Pruning and the confusion matrix",
    what: (
      <>
        <p><b>Pruning</b> cuts a branch back to a single leaf. Prune a branch when the tree does as well or better on the test set without it.</p>
        <p>A <b>confusion matrix</b> counts each kind of right and wrong answer, so you can see <b>which</b> mistakes a tree makes, not just how many.</p>
      </>
    ),
    how: (
      <>
        <table className="cm">
          <thead><tr><th /><th scope="col">Predicted Default</th><th scope="col">Predicted Repaid</th></tr></thead>
          <tbody>
            <tr><th scope="row">Actually defaulted</th><td className="ok">caught</td><td className="bad">missed</td></tr>
            <tr><th scope="row">Actually repaid</th><td className="bad">false alarm</td><td className="ok">cleared</td></tr>
          </tbody>
        </table>
        <div className="formula" style={{ marginTop: 12 }}>accuracy = <Frac top="caught + cleared" bottom="total" /> · error rate = 1 − accuracy</div>
      </>
    ),
    exampleTitle: "Score the pruned tree on 8 new applicants",
    steps: [
      { text: <>The pruned tree: good credit and income over 30 → Repaid. Everyone else → Default.</>, eq: "predicted Repaid: Mei, Omar, Pooja", say: "Outlined: the three it would lend to.", highlight: { lit: [good, "income>30"] } },
      { text: "Who actually defaulted? Nikhil, Oscar, Priya and Quinn. The tree predicted Default for all four.", eq: "caught 4 · missed 0", say: "No defaulter slips through.", highlight: { lit: [defaulted] } },
      { text: "Who actually repaid? Mei, Omar and Pooja were cleared. Rosa was declined.", eq: "cleared 3 · false alarm 1", say: "Rosa had poor credit but paid us back.", highlight: { lit: [repaid], both: [good] } },
      { text: "Add up the right answers.", eq: "accuracy = (4 + 3) ÷ 8 = 87.5%", say: "Better than the full tree's 5 of 8." },
    ],
    remember: [
      "Prune a branch if the tree does as well or better on the test set without it.",
      "A missed default costs the bank the loan. A false alarm costs it a good customer.",
      "Read each path from root to leaf as an IF … THEN rule.",
      "The root question is usually the most important variable.",
    ],
    says: ["Last counter: trim and report.", "Four boxes, two kinds of mistake.", "Let's score the pruned tree.", "Let's finish the report."],
  },
  explore: { goal: "Prune the full tree, read its confusion matrix, and write the rules.", Component: ExplorePrune },
  questions: [
    {
      id: "t6-full", type: "num", kind: "count", prompt: "Use the full tree below. How many of the 8 new applicants does it get right?", answer: 5, figure: <Tree node={FULL_TREE} />,
      traps: [{ value: 7, hint: "That's the pruned tree. The full tree also lends to anyone with poor credit and income over 75." }, { value: 8, hint: "Check Oscar and Priya: poor credit, income over 75." }],
      first: "Send each applicant down the tree and compare with their stamp.",
      ladder: ["The full tree lends to poor-credit applicants earning over $75k.", "Oscar and Priya earn over $75k with poor credit, and both defaulted. Rosa is declined but repaid."],
      explain: "It gets Oscar, Priya and Rosa wrong, so 5 of 8.",
      highlight: { lit: [poor] },
    },
    {
      id: "t6-acc", type: "num", kind: "proportion", prompt: "The pruned tree caught 4, missed 0, raised 1 false alarm and cleared 3. What is its accuracy?", answer: 7 / 8,
      traps: [{ value: 0.5, hint: "Add the caught and the cleared." }, { value: 1 / 8, hint: "That's the error rate. Accuracy is the right answers." }],
      first: "Accuracy = (caught + cleared) ÷ total.",
      ladder: ["Right answers: caught 4 + cleared 3.", "7 ÷ 8 = …?"],
      explain: "7 ÷ 8 = 87.5%. The one mistake is Rosa, a false alarm.",
    },
    {
      id: "t6-cost", type: "mc", prompt: "Which mistake costs the bank more?", layout: "list",
      options: [
        { text: "A false alarm: the bank turns away someone who would have repaid", hint: "That loses some interest and a customer, but not the whole loan." },
        { text: "A missed default: the bank lends and loses the money", correct: true },
      ],
      ladder: ["Which mistake means money goes out and doesn't come back?", "A missed default is a loan that isn't repaid."],
      explain: "A missed default loses the loan itself, so the bank cares most about catching defaults.",
    },
    {
      id: "t6-prune", type: "mc", prompt: "Which branch of the full tree should be pruned?", layout: "list", figure: <Tree node={FULL_TREE} />,
      options: [
        { text: "Income ≤ 30? on the good-credit side", hint: "Without it, the tree also lends to Nikhil, who defaulted. Test accuracy falls to 4 of 8." },
        { text: "Income ≤ 75? on the poor-credit side", correct: true },
        { text: "Credit = Good? at the root", hint: "Pruning the root leaves one leaf that predicts the same for everyone." },
        { text: "None. The full tree is best", hint: "The full tree only gets 5 of 8 test applicants right." },
      ],
      ladder: ["Which split was made for just one past applicant?", "The Income ≤ 75 split exists for Grace, and it lends to Oscar and Priya."],
      explain: "Pruning Income ≤ 75 lifts test accuracy from 5 of 8 to 7 of 8.",
      highlight: { lit: [poor], both: ["income>75"] },
    },
    {
      id: "t6-rule", type: "mc", prompt: "Which rule should Mr Lim use at the counter?", layout: "list",
      options: [
        { text: "IF income over $75k THEN lend", hint: "That's the Grace branch we pruned. Oscar and Priya defaulted." },
        { text: "IF collateral THEN lend", hint: "Collateral was a weak question. It never made it into the tree." },
        { text: "IF good credit AND income over $30k THEN lend", correct: true },
        { text: "IF student THEN decline", hint: "Job isn't in the pruned tree at all." },
      ],
      ladder: ["Read the Repaid leaf's path in the pruned tree.", "Good credit, then income over 30."],
      explain: "That's the pruned tree's only Repaid leaf, written as a rule.",
      highlight: { lit: [good, "income>30"] },
    },
  ],
};

export const loanOfficer: ActivityDef<Applicant> = {
  id: "loan-officer",
  shop: "Neighbourhood Bank",
  title: "Loan Officer",
  topic: "Decision trees",
  theme: {
    owner: { name: "Mr Lim", initials: "ML" },
    stop: "Counter",
    rows: ["applicant", "applicants"],
    intro: "Decision trees at Mr Lim's bank branch. Each counter is one mission: a quick review, a hands-on task and a checkpoint.",
    greeting: "Hi, I'm Mr Lim, manager at Neighbourhood Bank. I've got twelve past loans and a queue of new applicants. Help me build a tree that tells me who'll pay us back.",
    finale: "That's every counter done. You read, built, tested and pruned a real decision tree. You're my new loan officer.",
  },
  view: { Grid: Applicants, has },
  missions: [m1, m2, m3, m4, m5, m6],
};
