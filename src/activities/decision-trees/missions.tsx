import type { ActivityDef, MissionDef } from "../../core/types";
import { Frac } from "../../components/ui";
import type { Applicant } from "./data";
import { TRAIN } from "./data";
import { has } from "./engine";
import { ExploreImpurity, ExploreReadTree } from "./explores";
import { BANK_TREE } from "./trees";
import { Applicants, Tree } from "./ui";

type Mission = MissionDef<Applicant>;

const PAST = "Neighbourhood Bank · 12 past loans";
const good = "credit=Good", poor = "credit=Poor", repaid = "outcome=Repaid", defaulted = "outcome=Default";

const m1: Mission = {
  n: 1,
  title: "Read the Tree",
  concept: "Reading a decision tree",
  badge: "Tree Reader",
  data: TRAIN,
  dataLabel: PAST,
  brief: "Welcome to Neighbourhood Bank. Before you build a tree, learn to read one. This is the tree I use to decide who gets a loan.",
  card: { formula: "prediction = the majority outcome in the leaf you land in", example: "Ella: good credit → income $38k > $30k → leaf of 5 repaid → Repaid" },
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
      { text: <>Next: <b>Income ≤ $30k?</b> Ella earns $38k, so go down the no branch.</>, eq: "$38k > $30k → no →", say: "Of the good-credit six, only Dev earned $30k or less.", highlight: { lit: [good], both: ["income>30"], only: true } },
      { text: "That's a leaf. All 5 past loans there were repaid.", eq: "predict Repaid · 5 of 5 = 100%", say: "So I'd lend to someone like Ella.", highlight: { lit: [good, "income>30"], both: [repaid] } },
    ],
    remember: [
      "The root is the first question. Leaves are where the questions end.",
      "Each leaf predicts the most common outcome of the past loans that landed in it.",
      "The share of that majority tells you how sure the leaf is: the poor-credit leaf is 5 of 6, about 83%.",
      "Every path from root to leaf reads as a rule: IF good credit AND income > $30k THEN Repaid.",
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
      ladder: ["Good credit: go down the yes branch. Then answer the income question.", "$25k is $30k or less, so take the yes branch to the Default leaf."],
      explain: "Good credit → yes; $25k ≤ $30k → yes; that leaf predicts Default.",
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
      ladder: ["The Repaid leaf is good credit, then income over $30k.", "Aisha, Ben, Chloe, Ella and Farid all have good credit and earn over $30k."],
      explain: "Five applicants land there, and all five repaid.",
      highlight: { lit: [good, "income>30"] },
    },
    {
      id: "t1-rule", type: "mc", prompt: "Which rule does this tree contain?", layout: "list", figure: <Tree node={BANK_TREE} />,
      options: [
        { text: "IF income > $30k THEN Repaid", hint: "Income is only asked after good credit. Poor-credit applicants are declined at any income." },
        { text: "IF poor credit THEN Repaid", hint: "The poor-credit leaf predicts Default." },
        { text: "IF good credit AND income > $30k THEN Repaid", correct: true },
        { text: "IF good credit THEN Default", hint: "Most good-credit applicants land in the Repaid leaf." },
      ],
      ladder: ["A rule is one path from the root to a leaf.", "Follow yes, then no, to the green leaf. Which conditions did you pass?"],
      explain: "Each path is a rule. Yes to good credit and no to income ≤ $30k gives Repaid.",
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
  brief: "A good leaf is one where everyone had the same outcome. Gini and entropy tell me how mixed a group is. You won't need to work them out, just read them.",
  card: { formula: "Gini runs 0 to 0.5 · entropy runs 0 to 1 · 0 = pure, highest = evenly mixed", example: "5 repaid, 1 defaulted: Gini 0.28, entropy 0.65, mostly one outcome" },
  review: {
    title: "Impurity: Gini and entropy",
    what: (
      <>
        <p>A group is <b>pure</b> when everyone in it had the same outcome. The more mixed it is, the higher its <b>impurity</b>.</p>
        <p>Trees try to end up with pure leaves, because a pure leaf makes a confident prediction.</p>
        <p style={{ color: "var(--sub)" }}>Two common ways to measure impurity: the <b>Gini index</b> and <b>entropy</b>. They give different numbers but tell the same story.</p>
      </>
    ),
    howHeading: ["How to read it", "The impurity scale"],
    how: (
      <>
        <table className="mini">
          <thead><tr><th scope="col">Group</th><th scope="col">Gini</th><th scope="col">Entropy</th><th scope="col">What it means</th></tr></thead>
          <tbody>
            <tr><th scope="row">6 ✓ 0 ✗</th><td>0</td><td>0</td><td>Pure: everyone the same</td></tr>
            <tr><th scope="row">5 ✓ 1 ✗</th><td>0.28</td><td>0.65</td><td>Mostly one outcome</td></tr>
            <tr><th scope="row">4 ✓ 2 ✗</th><td>0.44</td><td>0.92</td><td>Leaning one way</td></tr>
            <tr><th scope="row">3 ✓ 3 ✗</th><td>0.5</td><td>1</td><td>Evenly mixed: as unsure as it gets</td></tr>
          </tbody>
        </table>
        <p><b>Lower is purer.</b> Gini tops out at 0.5 and entropy at 1, so only compare Gini with Gini, and entropy with entropy.</p>
        <p style={{ color: "var(--sub)", fontSize: "0.88rem" }}>Behind the numbers: Gini = 1 − (share repaid)² − (share defaulted)². Entropy = − Σ share × log₂(share). Both are 0 when one share is 100%, and highest when the shares are equal.</p>
      </>
    ),
    exampleTitle: "Read the impurity of Mr Lim's groups",
    steps: [
      { text: "The Repaid leaf: 5 repaid, 0 defaulted.", eq: "Gini 0 · entropy 0 → pure", say: "Every one of them paid us back. A very confident leaf.", highlight: { lit: [good, "income>30"] } },
      { text: "The poor-credit leaf: 1 repaid, 5 defaulted.", eq: "Gini 0.28 · entropy 0.65 → mostly Default", say: "Grace is the exception, so this leaf is a little mixed.", highlight: { lit: [poor], both: [defaulted] } },
      { text: "All 12 loans, before the tree asks anything: 6 and 6.", eq: "Gini 0.5 · entropy 1 → as mixed as it gets", say: "That's why the tree asks questions: to push impurity down towards 0.", highlight: { lit: [repaid] } },
    ],
    remember: [
      "Impurity 0 means pure: everyone in the group had the same outcome.",
      "The highest values, Gini 0.5 and entropy 1, mean an even 50/50 mix.",
      "Lower impurity means a more confident prediction.",
      "Gini and entropy use different scales but agree on which group is purer.",
    ],
    says: ["One idea: how mixed is a group?", "Read the scale. No calculating needed.", "Let's read a few of my groups.", "Now you try."],
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
      id: "t2-zero", type: "mc", prompt: "A leaf has a Gini index of 0. What does that tell Mr Lim?", layout: "list",
      options: [
        { text: "Nobody in it repaid", hint: "Gini 0 could also mean everyone repaid. It's about being all the same." },
        { text: "Everyone in it had the same outcome", correct: true },
        { text: "The leaf is half repaid, half defaulted", hint: "That's the most mixed case, Gini 0.5." },
        { text: "The tree made a mistake", hint: "A Gini of 0 is the best a leaf can be." },
      ],
      ladder: ["0 is the bottom of the scale.", "The bottom of the scale means pure."],
      explain: "Gini 0 means pure: everyone in the leaf had the same outcome, so its prediction is as sure as it can be.",
    },
    {
      id: "t2-one", type: "mc", prompt: "A group has an entropy of 1. What does it look like?", layout: "list",
      options: [
        { text: "Everyone repaid", hint: "That group is pure, so its entropy is 0." },
        { text: "Mostly repaid, one default", hint: "That leans one way, so its entropy is below 1." },
        { text: "Half repaid, half defaulted", correct: true },
        { text: "Everyone defaulted", hint: "That group is pure too: entropy 0." },
      ],
      ladder: ["1 is the top of the entropy scale.", "The top of the scale is the most mixed group."],
      explain: "Entropy 1 is the most mixed a group of two outcomes can be: an even 50/50 split.",
    },
    {
      id: "t2-leaf", type: "mc", prompt: "Which leaf in Mr Lim's tree has the highest impurity?", layout: "list", figure: <Tree node={BANK_TREE} />,
      options: [
        { text: "The Repaid leaf (5 of 5 repaid)", hint: "Everyone there repaid. That's pure." },
        { text: "The Default leaf for income ≤ $30k (1 of 1)", hint: "One applicant, one outcome. That's pure." },
        { text: "The poor-credit leaf (5 of 6 defaulted)", correct: true },
      ],
      ladder: ["Look for the leaf that is not 100% one outcome.", "Grace repaid in a leaf where everyone else defaulted."],
      explain: "The poor-credit leaf mixes 5 defaults with 1 repaid (Gini 0.28). The other two leaves are pure (Gini 0).",
      highlight: { lit: [poor], both: [defaulted] },
    },
    {
      id: "t2-compare", type: "mc", prompt: "Group A has a Gini of 0.10. Group B has a Gini of 0.45. Which would make the more confident leaf?",
      options: [
        { text: "Group B", hint: "0.45 is close to the 0.5 maximum, so Group B is nearly 50/50." },
        { text: "Group A", correct: true },
      ],
      ladder: ["Lower impurity means purer.", "Which number is closer to 0?"],
      explain: "Group A is nearer 0, so it's mostly one outcome. Group B is close to 0.5, nearly evenly mixed.",
    },
    {
      id: "t2-scales", type: "mc", prompt: "The good-credit group has Gini 0.28 and entropy 0.65. Is it purer by Gini or by entropy?", layout: "list",
      options: [
        { text: "By Gini, because 0.28 is lower", hint: "The two measures use different scales. Gini tops out at 0.5, entropy at 1." },
        { text: "By entropy, because 0.65 is higher", hint: "Higher impurity means more mixed, not purer." },
        { text: "Neither: it's the same group measured on two scales", correct: true },
      ],
      ladder: ["Both numbers describe the same six applicants.", "Gini runs 0 to 0.5 and entropy runs 0 to 1. Only compare like with like."],
      explain: "It's one group on two different scales. Both say the same thing: mostly one outcome, a little mixed.",
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
    greeting: "Hi, I'm Mr Lim, manager at Neighbourhood Bank. I've got a decision tree built from twelve past loans and a queue of new applicants. Help me read it and understand what it's telling me.",
    finale: "That's every counter done. You can read my tree and tell how sure each leaf is. You're my new loan officer.",
  },
  view: { Grid: Applicants, has },
  missions: [m1, m2],
};
