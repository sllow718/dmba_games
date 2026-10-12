import type { ActivityDef, MissionDef } from "../../core/types";
import { Frac, Slips, Token } from "../../components/ui";
import { SATURDAY, WEEK } from "./data";
import { ExploreApriori, ExploreLift, ExploreReceipts, ExploreReport, ExploreRules, ExploreSupport } from "./explores";

const SAT = "Corner Mart · Saturday morning · 10 receipts";
const set = (...xs: string[]) => `{${xs.join(", ")}}`;

const m1: MissionDef = {
  n: 1,
  title: "Read the Receipts",
  concept: "Transactions, itemsets & rules",
  badge: "Receipt Reader",
  data: SATURDAY,
  dataLabel: SAT,
  brief: "Welcome to Corner Mart. These are Saturday morning's receipts. Before we find any patterns, let's agree on the words.",
  card: { formula: "count(X) = receipts containing every item in X", example: "count({Bread}) = 6" },
  review: {
    title: "Receipts, items and itemsets",
    what: (
      <>
        <p>A <b>transaction</b> is one customer's receipt. An <b>item</b> is one product on it.</p>
        <p>An <b>itemset</b> is any group of items, like {set("Bread", "Butter")}. The order doesn't matter.</p>
        <p>Shops store receipts as a table: one <b>row</b> per transaction, one <b>column</b> per item, <b>1</b> if it was bought and <b>0</b> if not.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">support count of X = number of receipts that contain <u>every</u> item in X</div>
        <p>A receipt counts once, and only if every item in the itemset is on it.</p>
      </>
    ),
    exampleTitle: "Count {Bread}, then {Bread, Eggs}",
    steps: [
      { text: <>Look for <b>Bread</b> on every receipt.</>, eq: "count({Bread}) = 6", say: "Six of my ten customers bought bread.", highlight: { lit: ["Bread"] } },
      { text: <>Now keep only receipts with <b>Bread and Eggs</b>.</>, eq: "count({Bread, Eggs}) = 3", say: "#4, #8 and #10 have both. Bread on its own doesn't count.", highlight: { lit: ["Bread"], both: ["Eggs"], only: true } },
    ],
    remember: [
      "One receipt = one transaction = one customer's basket.",
      "An itemset is a group of items. {Bread, Eggs} is the same itemset as {Eggs, Bread}.",
      "The support count of an itemset is the number of receipts that contain all of its items.",
      "In a receipt table, each row is a transaction, each column is an item, and 1 means bought.",
      "A rule is If-Then. The If part is the antecedent and the Then part is the consequent. Both are itemsets.",
    ],
    says: ["Let's start with the vocabulary.", "Counting is all you need for this aisle.", "Watch the receipts light up.", "Ready? Let's count some receipts."],
  },
  explore: { goal: "Tap the bread receipts, fill in the receipt table, then count an itemset and build a rule.", Component: ExploreReceipts },
  questions: [
    {
      id: "m1-table", type: "mc", prompt: "In the receipt table, row #5 has a 1 under Eggs and a 0 under Bread. What does that say?", layout: "list",
      options: [
        { text: "Customer #5 bought eggs but not bread", correct: true },
        { text: "Customer #5 bought one pack of eggs and no loaves", hint: "The table only records bought (1) or not bought (0). It doesn't record how many." },
        { text: "Customer #5 bought bread but not eggs", hint: "A 1 means the item is on the receipt. The 1 is under Eggs." },
        { text: "Customer #5 didn't buy anything", hint: "A row of all 0s would say that. This row has a 1." },
      ],
      ladder: ["Read each cell on its own: 1 means bought, 0 means not bought.", "Receipt #5 is Milk and Eggs. No bread on it."],
      explain: "A 1 means that item is on the receipt and a 0 means it isn't. Receipt #5 has eggs and no bread.",
    },
    {
      id: "m1-tap", type: "tap", prompt: "Tap every receipt that contains both Bread and Butter.", items: ["Bread", "Butter"],
      ladder: ["A receipt needs both tokens, Br and Bu. Bread on its own isn't enough.", "Bread and butter are together on #1, #2, #4, #6 and #10."],
      explain: "Five receipts have both, so the support count of {Bread, Butter} is 5.",
      highlight: { lit: ["Bread", "Butter"] },
    },
    {
      id: "m1-itemset", type: "mc", prompt: "Which of these is an itemset?", layout: "list",
      options: [
        { text: "Receipt #4", hint: "A receipt is a transaction: one customer's basket. An itemset is a group of items." },
        { text: "{Bread, Butter}", correct: true },
        { text: "Bread → Butter", hint: "That's a rule, with an \"if\" side and a \"then\" side. An itemset is just a group of items." },
        { text: "6", hint: "That's a count, not a group of items." },
      ],
      ladder: ["Itemsets are written in curly brackets.", "Look for the option that is just a group of products."],
      explain: "{Bread, Butter} is an itemset: a group of items, with no direction.",
    },
    {
      id: "m1-count", type: "num", kind: "count", prompt: "What is the support count of {Coffee, Cookies}?", answer: 2,
      traps: [{ value: 3, hint: "3 is coffee on its own, or cookies on its own. The receipt needs both." }],
      first: "Count receipts that have coffee and cookies together.",
      ladder: ["Coffee is on #3, #7 and #9. Which of those also have cookies?", "#3 and #7 have both. #9 has coffee but no cookies."],
      explain: "Only #3 and #7 have both, so the count is 2.",
      highlight: { lit: ["Coffee"], both: ["Cookies"], only: true },
    },
    {
      id: "m1-rule", type: "mc", prompt: "In the rule {Bread} → {Butter}, which part is the consequent?", layout: "list",
      options: [
        { text: "{Butter}, the Then part", correct: true },
        { text: "{Bread}, the If part", hint: "The If part is the antecedent. The consequent is the other side of the arrow." },
        { text: "Both {Bread} and {Butter}", hint: "A rule has two sides. Each side has its own name." },
        { text: "The arrow →", hint: "The arrow only separates the two itemsets. Each side is an itemset." },
      ],
      ladder: ["Read the rule as If Bread, Then Butter.", "Antecedent comes first (If). Consequent comes after (Then)."],
      explain: "The consequent is the Then part, {Butter}. The antecedent is the If part, {Bread}.",
    },
  ],
};

const m2: MissionDef = {
  n: 2,
  title: "Support Hunt",
  concept: "Support",
  badge: "Support Spotter",
  data: SATURDAY,
  dataLabel: SAT,
  brief: "Counts are nice, but I need percentages. And I only care about combinations that are common enough to matter.",
  card: { formula: "supp(X) = count(X) ÷ N", example: "supp({Bread, Butter}) = 5 ÷ 10 = 50%" },
  review: {
    title: "Support",
    what: (
      <>
        <p>Support tells you <b>how common</b> an item, or a combination of items, is across all the receipts.</p>
        <p>In shop terms: out of all customers, what share bought this?</p>
        <p style={{ color: "var(--sub)" }}>High support means lots of customers buy it. Low support means it's rare.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">support(X) = <Frac top="receipts containing X" bottom="total receipts" /></div>
        <p>For a combination like {set("Bread", "Butter")}, a receipt only counts if it has <b>every</b> item. Multiply by 100 for a percentage.</p>
      </>
    ),
    exampleTitle: "Support of {Bread, Butter}",
    steps: [
      { text: <>Find every receipt with <b>Bread</b>.</>, eq: "6 receipts", say: "First, all the bread buyers. I've outlined them.", highlight: { lit: ["Bread"] } },
      { text: <>Keep only the ones that <b>also</b> have <b>Butter</b>. #8 drops out: bread, but no butter.</>, eq: "5 receipts", say: "Now only the ones that took butter as well. That's the green ones.", highlight: { lit: ["Bread"], both: ["Butter"], only: true } },
      { text: "Count all the receipts.", eq: "N = 10", say: "Ten customers on Saturday morning.", highlight: { lit: ["Bread"], both: ["Butter"], only: true } },
      { text: "Divide.", eq: "supp({Bread, Butter}) = 5 ÷ 10 = 50%", say: "Half my customers buy bread and butter together. Good to know.", highlight: { lit: ["Bread"], both: ["Butter"], only: true } },
    ],
    remember: [
      "Support is always between 0% and 100%.",
      "A combination is never more common than any single item in it: {Bread, Butter} 50% ≤ Bread 60%.",
      <>Common mistake: counting receipts with Bread <em>or</em> Butter. It has to be both.</>,
      <>In this aisle, Mrs Tan only wants itemsets with support of <b>at least 30%</b>.</>,
    ],
    says: ["Before we start: one idea, one formula, one example.", "This is the only formula you need for this aisle.", "Let's try it on Saturday's receipts.", "That's it. Ready when you are."],
  },
  explore: { goal: "Use the support calculator, then set the minimum support to 30%.", Component: ExploreSupport },
  questions: [
    {
      id: "m2-supp", type: "num", kind: "proportion", prompt: "What is the support of {Coffee, Cookies}?", answer: 0.2,
      traps: [
        { value: 0.02, hint: "That looks like the count, 2. Support divides the count by the number of receipts." },
        { value: 2 / 3, hint: "That divides by the coffee receipts, which is confidence (Aisle 3). Support divides by all 10 receipts." },
        { value: 0.3, hint: "30% is coffee on its own. The receipt needs both coffee and cookies." },
      ],
      first: "Count the receipts with both, then divide by the total number of receipts.",
      ladder: ["#3 and #7 have coffee and cookies. How many receipts are there in total?", "2 receipts out of 10. So 2 ÷ 10 is…?"],
      explain: "2 ÷ 10 = 20%. One in five customers bought coffee and cookies together.",
      highlight: { lit: ["Coffee"], both: ["Cookies"], only: true },
    },
    {
      id: "m2-cut", type: "mc", prompt: "Minimum support is 30%. Does {Milk, Eggs} make the cut?", layout: "list",
      options: [
        { text: "Yes, its support is 40%", hint: "40% is eggs on their own. For the pair, a receipt needs both." },
        { text: "No, its support is 20%", correct: true },
        { text: "Yes, its support is 60%", hint: "60% is milk on its own." },
        { text: "No, its support is 0%", hint: "Some receipts do have milk and eggs together. Look at #5." },
      ],
      ladder: ["Eggs are on #4, #5, #8 and #10. Which of those also have milk?", "#5 and #10 have both: 2 of 10 receipts."],
      explain: "Only #5 and #10 have both: 20%, which is below the 30% cut-off.",
      highlight: { lit: ["Eggs"], both: ["Milk"], only: true },
    },
    {
      id: "m2-never", type: "mc", prompt: "Can {Bread, Butter} have higher support than {Butter} on its own?", layout: "list",
      options: [
        { text: "Yes, pairs are usually more common", hint: "Adding an item can only make the condition stricter, so fewer receipts can match." },
        { text: "No. Every receipt with bread and butter also has butter", correct: true },
        { text: "Only if bread is very popular", hint: "However popular bread is, a bread-and-butter receipt still needs butter." },
        { text: "It depends on the minimum support", hint: "The minimum support is just a cut-off. It doesn't change the counts." },
      ],
      ladder: ["Think about which receipts are counted for each. Is one group inside the other?", "Butter is on 5 receipts, and bread and butter together are on 5. The pair can tie, but never beat it."],
      explain: "A combination can never be more common than any item in it. This idea powers Apriori in Aisle 5.",
    },
    {
      id: "m2-triple", type: "num", kind: "proportion", prompt: "What is the support of {Bread, Butter, Milk}?", answer: 0.3,
      traps: [{ value: 0.5, hint: "50% is bread and butter. The receipt also needs milk." }, { value: 0.03, hint: "That's the count. Divide by the 10 receipts." }],
      first: "Count the receipts with all three, then divide by 10.",
      ladder: ["Bread and butter are together on #1, #2, #4, #6 and #10. Which of those also have milk?", "#1, #6 and #10 have all three. So 3 ÷ 10 is…?"],
      explain: "3 ÷ 10 = 30%, exactly on Mrs Tan's cut-off, so it stays.",
      highlight: { lit: ["Bread", "Butter"], both: ["Milk"], only: true },
    },
  ],
};

const m3: MissionDef = {
  n: 3,
  title: "If This, Then That",
  concept: "Confidence",
  badge: "Rule Maker",
  data: SATURDAY,
  dataLabel: SAT,
  brief: "When someone picks up bread, how likely are they to grab butter too? That's what I want to know.",
  card: { formula: "conf(X → Y) = count(X and Y) ÷ count(X)", example: "conf(Bread → Butter) = 5 ÷ 6 = 83%" },
  review: {
    title: "Rules and confidence",
    what: (
      <>
        <p>A <b>rule</b> X → Y reads "if a customer buys X, they also buy Y". X is the <b>if</b> side and Y is the <b>then</b> side.</p>
        <p><b>Confidence</b> answers: of the customers who bought X, what share also bought Y?</p>
      </>
    ),
    how: (
      <>
        <div className="formula">confidence(X → Y) = <Frac top="receipts with X and Y" bottom="receipts with X" /></div>
        <p>The bottom is only the "if" customers, not everyone. That's the difference from support.</p>
      </>
    ),
    exampleTitle: "Confidence of Bread → Butter",
    steps: [
      { text: <>Find the <b>if</b> customers: receipts with Bread.</>, eq: "6 receipts", say: "These six are the only customers this rule is about.", highlight: { lit: ["Bread"] } },
      { text: <>Of those, count the ones that <b>also</b> have Butter.</>, eq: "5 receipts", say: "Five of the six took butter. #8 didn't.", highlight: { lit: ["Bread"], both: ["Butter"] } },
      { text: "Divide by the if customers, not all 10.", eq: "conf(Bread → Butter) = 5 ÷ 6 = 83%", say: "So 83% of my bread buyers take butter.", highlight: { lit: ["Bread"], both: ["Butter"] } },
    ],
    remember: [
      "Confidence divides by the receipts on the if side, not by all receipts.",
      "Direction matters: Bread → Butter and Butter → Bread usually have different confidence.",
      "Confidence is between 0% and 100%. 100% means every if customer also bought the then item.",
    ],
    says: ["Now we start making rules.", "Watch the bottom of the fraction. That's where people slip up.", "Let's work out bread then butter.", "Got it? Let's build some rules."],
  },
  explore: { goal: "Build Bread → Butter, flip it, and find another strong rule.", Component: ExploreRules },
  questions: [
    {
      id: "m3-bb", type: "num", kind: "proportion", prompt: "What is the confidence of Bread → Butter?", answer: 5 / 6,
      traps: [
        { value: 0.5, hint: "That's 5 out of all 10 customers, which is the support. For confidence I only want the bread buyers." },
        { value: 1, hint: "That's Butter → Bread. Here bread comes first, so divide by the bread receipts." },
      ],
      first: "Confidence only looks at the customers who bought the \"if\" item: bread.",
      ladder: ["6 receipts have bread. I've lit them up. How many of those also have butter?", "5 of the 6 bread receipts have butter. So 5 ÷ 6 is…?"],
      explain: "5 ÷ 6 ≈ 83%. Most of my bread buyers take butter too.",
      highlight: { lit: ["Bread"], both: ["Butter"] },
    },
    {
      id: "m3-flip", type: "num", kind: "proportion", prompt: "What is the confidence of Butter → Bread?", answer: 1,
      traps: [
        { value: 5 / 6, hint: "That's Bread → Butter. Now butter comes first, so divide by the butter receipts." },
        { value: 0.5, hint: "That's the support. Divide by the butter receipts only." },
      ],
      first: "This time the \"if\" customers are the butter buyers.",
      ladder: ["Butter is on 5 receipts. How many of those also have bread?", "All 5 butter receipts have bread. So 5 ÷ 5 is…?"],
      explain: "5 ÷ 5 = 100%. Every butter buyer also bought bread.",
      highlight: { lit: ["Butter"], both: ["Bread"] },
    },
    {
      id: "m3-why", type: "mc", prompt: "Why do Bread → Butter and Butter → Bread have different confidence?", layout: "list",
      options: [
        { text: "They divide by different groups of customers", correct: true },
        { text: "One of the calculations is wrong", hint: "Both are right. 83% and 100% are what the receipts say." },
        { text: "Their support is different", hint: "Both rules have the same support: the 5 receipts with bread and butter." },
        { text: "Confidence changes every time you calculate it", hint: "The same receipts always give the same answer." },
      ],
      ladder: ["Look at the bottom of each fraction.", "One divides by the 6 bread buyers and the other by the 5 butter buyers."],
      explain: "Bread → Butter divides by the 6 bread buyers, Butter → Bread by the 5 butter buyers. Same top, different bottom.",
    },
    {
      id: "m3-cc", type: "mc", prompt: "What is the confidence of Coffee → Cookies?",
      options: [
        { text: "20%", hint: "That's the support: 2 of all 10 receipts." },
        { text: "33%", hint: "Check again: how many coffee receipts have cookies?" },
        { text: "67%", correct: true },
        { text: "100%", hint: "#9 has coffee but no cookies." },
      ],
      ladder: ["Coffee is on 3 receipts. How many of those also have cookies?", "2 of the 3 coffee receipts have cookies. So 2 ÷ 3 is…?"],
      explain: "2 ÷ 3 ≈ 67% of coffee buyers also took cookies.",
      highlight: { lit: ["Coffee"], both: ["Cookies"] },
    },
  ],
};

const m4: MissionDef = {
  n: 4,
  title: "The Lift Lens",
  concept: "Lift",
  badge: "Lift Detective",
  data: SATURDAY,
  dataLabel: SAT,
  brief: "My nephew says half of bread buyers buy milk, so I should put the milk next to the bread. Is he right?",
  card: { formula: "lift(X → Y) = conf(X → Y) ÷ supp(Y)", example: "lift(Coffee → Cookies) = 67% ÷ 30% = 2.22" },
  review: {
    title: "Lift",
    what: (
      <>
        <p>Confidence alone can fool you. If Y is popular anyway, lots of X buyers will buy Y by chance.</p>
        <p><b>Lift</b> compares the rule's confidence with the <b>baseline</b>: how often anyone buys Y.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">lift(X → Y) = <Frac top="confidence(X → Y)" bottom="support(Y)" /></div>
        <ul>
          <li><b>Above 1:</b> X buyers are more likely than usual to buy Y. Useful.</li>
          <li><b>Exactly 1:</b> no effect.</li>
          <li><b>Below 1:</b> X buyers are less likely than usual to buy Y.</li>
        </ul>
      </>
    ),
    exampleTitle: "Lift of Coffee → Cookies",
    steps: [
      { text: "Confidence: of the coffee buyers, how many took cookies?", eq: "2 ÷ 3 = 67%", say: "Two of my three coffee buyers took cookies.", highlight: { lit: ["Coffee"], both: ["Cookies"] } },
      { text: "Baseline: of all customers, how many took cookies?", eq: "3 ÷ 10 = 30%", say: "Normally only 30% of customers buy cookies.", highlight: { lit: ["Cookies"] } },
      { text: "Divide confidence by the baseline.", eq: "lift = 67% ÷ 30% = 2.22", say: "Coffee buyers are more than twice as likely to take cookies. That's a real tip.", highlight: { lit: ["Coffee"], both: ["Cookies"] } },
    ],
    remember: [
      "High confidence isn't enough. Always compare it with how popular the then item is anyway.",
      "Lift above 1 is useful, 1 means no effect, and below 1 means less likely.",
      "Lift is a ratio, not a percentage: 2.22 means 2.22 times as likely.",
    ],
    says: ["Time to check my nephew's idea.", "One more division, and it changes everything.", "Coffee and cookies first.", "Now let's look at that bread and milk."],
  },
  explore: { goal: "Check the nephew's rule, compare it with Coffee → Cookies, and find a rule with lift 1.", Component: ExploreLift },
  questions: [
    {
      id: "m4-base", type: "num", kind: "proportion", prompt: "What share of all customers buy Milk?", answer: 0.6,
      traps: [{ value: 0.5, hint: "50% is milk among bread buyers. I mean all customers." }, { value: 0.06, hint: "That looks like the count, 6. Divide by 10 receipts." }],
      first: "Count every receipt with milk and divide by all 10.",
      ladder: ["Milk is lit up now. How many receipts is that?", "Milk is on 6 of the 10 receipts. So 6 ÷ 10 is…?"],
      explain: "6 ÷ 10 = 60%. That's the baseline for milk.",
      highlight: { lit: ["Milk"] },
    },
    {
      id: "m4-lift", type: "num", kind: "ratio", prompt: "Bread → Milk has 50% confidence. What is its lift?", answer: 5 / 6,
      traps: [
        { value: 1.2, hint: "You've divided the wrong way round. Lift is confidence ÷ baseline: 50% ÷ 60%." },
        { value: 0.5, hint: "That's the confidence. Now divide it by the milk baseline." },
        { value: 0.3, hint: "That's the support. Lift uses confidence ÷ baseline." },
      ],
      first: "Lift = confidence ÷ how often anyone buys milk.",
      ladder: ["The confidence is 50% and the milk baseline is 60%.", "50% ÷ 60% = 0.5 ÷ 0.6 = ?"],
      explain: "0.5 ÷ 0.6 ≈ 0.83. Bread buyers are a little less likely than average to buy milk.",
      highlight: { lit: ["Bread"], both: ["Milk"] },
    },
    {
      id: "m4-move", type: "mc", prompt: "So should Mrs Tan put the milk next to the bread to sell more milk?", layout: "list",
      options: [
        { text: "Yes. Half of bread buyers also buy milk", hint: "50% sounds good. But how often does anyone buy milk?" },
        { text: "Yes. The pair has 30% support", hint: "Support only says the pair is common. It doesn't say bread makes people buy milk." },
        { text: "No. Bread buyers buy milk less often than customers overall", correct: true },
        { text: "No. A rule needs 100% confidence to be useful", hint: "Hardly any rule hits 100%. The question is whether 50% beats the usual milk rate." },
      ],
      ladder: ["Compare the 50% with the milk baseline you just worked out.", "Bread buyers: 50%. Everyone: 60%. Lift 0.83 is below 1."],
      explain: "Lift is 0.83, below 1. Moving the milk won't sell more of it. Sorry, nephew.",
      highlight: { lit: ["Milk"] },
    },
    {
      id: "m4-one", type: "mc", prompt: "{Bread, Butter} → Milk has lift 1.00. What does that mean?", layout: "list",
      options: [
        { text: "Buying bread and butter makes no difference to buying milk", correct: true },
        { text: "Every bread-and-butter buyer buys milk", hint: "That would be 100% confidence, not lift 1." },
        { text: "It's the strongest rule in the shop", hint: "Lift 1 is neither strong nor weak. It's the no-effect point." },
        { text: "The rule has a mistake in it", hint: "No mistake: 60% confidence ÷ 60% baseline = 1." },
      ],
      ladder: ["Lift compares confidence with the baseline. What if they're equal?", "60% of bread-and-butter buyers buy milk, and 60% of everyone does."],
      explain: "Lift 1 means independence: the if side doesn't change how likely the then side is.",
    },
    {
      id: "m4-best", type: "mc", prompt: "Which rule is the best tip for Mrs Tan?", layout: "list",
      options: [
        { text: "Bread → Milk · confidence 50% · lift 0.83", hint: "Lift below 1: bread buyers are less likely to buy milk." },
        { text: "Coffee → Cookies · confidence 67% · lift 2.22", correct: true },
        { text: "{Bread, Butter} → Milk · confidence 60% · lift 1.00", hint: "Lift 1 means no effect." },
        { text: "Eggs → Milk · confidence 50% · lift 0.83", hint: "Lift below 1 again." },
      ],
      ladder: ["Look for the rule whose lift is clearly above 1.", "Only one rule has lift above 1."],
      explain: "Coffee → Cookies has lift 2.22: coffee buyers are more than twice as likely to take cookies.",
    },
  ],
};

const m5: MissionDef = {
  n: 5,
  title: "Apriori Climb",
  concept: "Apriori principle",
  badge: "Apriori Ace",
  data: SATURDAY,
  dataLabel: SAT,
  brief: "With 6 products there are 63 possible itemsets. With 600 products I'd never finish counting. There's a shortcut.",
  card: { formula: "X is rare ⇒ every itemset containing X is rare", example: "{Butter, Eggs} rare ⇒ skip {Bread, Butter, Eggs}" },
  review: {
    title: "The Apriori principle",
    what: (
      <>
        <p>Apriori finds every <b>frequent itemset</b> (support at or above the minimum) one level at a time: single items, then pairs, then triples.</p>
        <p>The shortcut: <b>if an itemset is rare, every bigger itemset that contains it is rare too</b>, so we never need to count those.</p>
      </>
    ),
    how: (
      <>
        <div className="formula">support(X ∪ Y) ≤ support(X)</div>
        <ul>
          <li>Count single items and keep the frequent ones.</li>
          <li>Build pairs only from frequent items, count them and keep the frequent ones.</li>
          <li>Build triples only from frequent pairs. Skip any triple that contains a rare pair.</li>
        </ul>
      </>
    ),
    exampleTitle: "Why {Bread, Butter, Eggs} can be skipped",
    steps: [
      { text: <>At 30% minimum support, an itemset needs 3 receipts. Count <b>{"{Butter, Eggs}"}</b>.</>, eq: "2 receipts: too rare", say: "Butter and eggs only appear together twice.", highlight: { lit: ["Butter"], both: ["Eggs"], only: true } },
      { text: <>Any receipt with Bread, Butter and Eggs must also have Butter and Eggs.</>, eq: "count({Bread, Butter, Eggs}) ≤ 2", say: "So the triple can't possibly reach 3.", highlight: { lit: ["Butter", "Eggs"] } },
      { text: "So we skip it without counting.", eq: "Pruned. 10 receipt checks saved.", say: "That's 10 receipts I don't have to look at. Now imagine 10,000.", highlight: { lit: ["Bread", "Butter"], both: ["Eggs"], only: true } },
    ],
    remember: [
      "Frequent means support at or above the minimum. Rare means below it.",
      "A bigger itemset can never be more common than a smaller one inside it.",
      "Only combine frequent itemsets, and skip any candidate that contains a rare one.",
    ],
    says: ["This is how real tools cope with thousands of products.", "It's the support rule from Aisle 2, used as a shortcut.", "Here's one skip in action.", "Let's stock the shelves."],
  },
  explore: { goal: "Count single items, then pairs, then decide which triples are worth counting.", Component: ExploreApriori },
  questions: [
    {
      id: "m5-skip", type: "mc", prompt: "{Butter, Eggs} is on 2 receipts, below the minimum of 3. Do we need to count {Bread, Butter, Eggs}?", layout: "list",
      options: [
        { text: "No. It contains a rare pair, so it must be rare too", correct: true },
        { text: "Yes. Bread is very common", hint: "Adding a common item can't add receipts. Every match still needs butter and eggs." },
        { text: "Yes. Every candidate has to be counted", hint: "That's the brute-force way. Apriori exists to avoid it." },
        { text: "No. Triples are never frequent", hint: "Not true: {Bread, Butter, Milk} is a frequent triple here." },
      ],
      ladder: ["Can a triple be more common than a pair inside it?", "At most 2 receipts can have Bread, Butter and Eggs, because only 2 have Butter and Eggs."],
      explain: "A superset of a rare itemset is always rare, so it's pruned without counting.",
      highlight: { lit: ["Butter"], both: ["Eggs"], only: true },
    },
    {
      id: "m5-cand", type: "mc", prompt: "The frequent pairs are Bread·Butter, Bread·Milk, Bread·Eggs and Butter·Milk. Which triple is worth counting?", layout: "list",
      options: [
        { text: "{Bread, Butter, Milk}", correct: true },
        { text: "{Bread, Butter, Eggs}", hint: "Butter·Eggs isn't a frequent pair, so this triple is pruned." },
        { text: "{Bread, Milk, Eggs}", hint: "Milk·Eggs isn't a frequent pair, so this triple is pruned." },
        { text: "{Milk, Coffee, Cookies}", hint: "None of its pairs is frequent." },
      ],
      ladder: ["A triple is worth counting only if all three of its pairs are frequent.", "Check the pairs inside each option against the list of four."],
      explain: "Bread·Butter, Bread·Milk and Butter·Milk are all frequent, so {Bread, Butter, Milk} is the one candidate.",
    },
    {
      id: "m5-count", type: "num", kind: "count", prompt: "How many receipts contain {Bread, Butter, Milk}?", answer: 3,
      traps: [{ value: 5, hint: "5 is bread and butter. The receipt also needs milk." }],
      first: "Look for receipts with all three tokens.",
      ladder: ["Bread and butter are together on #1, #2, #4, #6 and #10. Which also have milk?", "#1, #6 and #10."],
      explain: "Three receipts: exactly the minimum, so it's frequent.",
      highlight: { lit: ["Bread", "Butter"], both: ["Milk"], only: true },
    },
    {
      id: "m5-why", type: "mc", prompt: "Why does Apriori save work?", layout: "list",
      options: [
        { text: "Rare itemsets let it skip all the bigger combinations that contain them", correct: true },
        { text: "It reads each receipt faster", hint: "Each count still reads every receipt. The saving is in how many counts it does." },
        { text: "It throws away rare items before counting anything", hint: "It counts single items first. It can't know they're rare until it counts them." },
        { text: "It only ever looks at pairs", hint: "It goes as far as it needs: pairs, triples and beyond." },
      ],
      ladder: ["In the Explore task, which triples did you skip?", "Each skipped triple contained a pair that was already too rare."],
      explain: "Skipping every bigger itemset that contains a rare one is the saving: 22 counts instead of all 63 combinations here.",
    },
  ],
};

const m6: MissionDef = {
  n: 6,
  title: "Manager's Meeting",
  concept: "The full process",
  badge: "Basket Detective",
  data: WEEK,
  dataLabel: "Corner Mart · one week · 30 receipts",
  brief: "This is a full week of receipts. I want three rules I can act on by Monday: support at least 20%, confidence at least 60%, and lift above 1.",
  card: { formula: "support → confidence → lift → action", example: "Fries → Soda: 23% · 88% · lift 3.28 → display them together" },
  review: {
    title: "Putting it together",
    what: (
      <>
        <p>A useful rule must pass three checks:</p>
        <ul>
          <li><b>Support</b>: common enough to matter.</li>
          <li><b>Confidence</b>: reliable for the if customers.</li>
          <li><b>Lift above 1</b>: better than the then item's normal rate.</li>
        </ul>
      </>
    ),
    how: (
      <>
        <div className="formula">supp = <Frac top="count(X and Y)" bottom="N" /> · conf = <Frac top="count(X and Y)" bottom="count(X)" /> · lift = <Frac top="conf" bottom="supp(Y)" /></div>
        <p>Mrs Tan's thresholds: support ≥ 20%, confidence ≥ 60%, lift &gt; 1.</p>
      </>
    ),
    exampleTitle: "Fries → Soda on this week's receipts",
    steps: [
      { text: <>Support: receipts with <Token item="Fries" /> and <Token item="Soda" />.</>, eq: "7 ÷ 30 = 23% ✓", say: "Seven baskets out of thirty. Common enough.", highlight: { lit: ["Fries"], both: ["Soda"], only: true } },
      { text: "Confidence: of the 8 fries buyers, how many took soda?", eq: "7 ÷ 8 = 88% ✓", say: "Nearly every fries buyer takes soda.", highlight: { lit: ["Fries"], both: ["Soda"] } },
      { text: "Lift: compare with soda's normal rate of 8 ÷ 30 = 27%.", eq: "88% ÷ 27% = 3.28 ✓", say: "More than three times as likely as usual. That's a rule I can use.", highlight: { lit: ["Fries"], both: ["Soda"] } },
    ],
    remember: [
      "Check all three: support, confidence and lift.",
      "Strong but rare rules (low support) aren't worth a shelf change.",
      "Rules into very popular items, like milk here, often have lift below 1.",
      "End with an action: a bundle, a shelf placement or a promotion.",
    ],
    says: ["One last job before my Monday meeting.", "Three numbers, three checks.", "Here's one rule checked end to end.", "Find me three good ones."],
  },
  explore: { goal: "Add three rules to the report that pass all three thresholds.", Component: ExploreReport },
  questions: [
    {
      id: "m6-wine", type: "mc", prompt: "Wine → Cheese has 100% confidence and lift 4.29. Why can't it go in the report?", layout: "list",
      options: [
        { text: "Its support is only 10%, below the 20% minimum", correct: true },
        { text: "Its lift is too high", hint: "There's no upper limit on lift. Higher is better." },
        { text: "Confidence can't really be 100%", hint: "It can: every wine buyer here took cheese." },
        { text: "Wine and cheese are in different aisles", hint: "Aisles don't matter to the maths." },
      ],
      ladder: ["Check each of the three thresholds in turn.", "Wine is on only 3 of 30 receipts."],
      explain: "Only 3 of 30 receipts (10%) have wine and cheese. It's strong, but too rare to act on.",
      highlight: { lit: ["Wine"], both: ["Cheese"] },
    },
    {
      id: "m6-pasta-milk", type: "mc", prompt: "Pasta → Milk: support 17%, confidence 56%, lift 0.88. Which thresholds does it fail?", layout: "list",
      options: [
        { text: "Only lift", hint: "Check support against 20% and confidence against 60% too." },
        { text: "Only support", hint: "Confidence 56% is under 60%, and lift 0.88 isn't above 1." },
        { text: "All three", correct: true },
        { text: "None, it passes", hint: "17% < 20%, 56% < 60% and 0.88 ≤ 1." },
      ],
      ladder: ["Compare 17% with 20%, 56% with 60%, and 0.88 with 1.", "Every one of them falls short."],
      explain: "It fails all three. Milk is in 63% of baskets, so rules into milk rarely beat its baseline.",
      highlight: { lit: ["Pasta"], both: ["Milk"] },
    },
    {
      id: "m6-conf", type: "num", kind: "proportion", prompt: "What is the confidence of {Pasta, Tomato} → Cheese?", answer: 0.75,
      traps: [
        { value: 0.2, hint: "That's the support: 6 of all 30 receipts." },
        { value: 2 / 3, hint: "That's Pasta → Cheese. The if side needs both pasta and tomato." },
      ],
      first: "The if customers are the ones with both pasta and tomato.",
      ladder: ["Pasta and tomato are together on 8 receipts. How many of those have cheese?", "6 of those 8 have cheese. So 6 ÷ 8 is…?"],
      explain: "6 ÷ 8 = 75% of pasta-and-tomato buyers also took cheese.",
      highlight: { lit: ["Pasta", "Tomato"], both: ["Cheese"] },
    },
    {
      id: "m6-action", type: "mc", prompt: "{Pasta, Tomato} → Cheese passes every check (support 20%, confidence 75%, lift 3.21). What should Corner Mart do?", layout: "list",
      options: [
        { text: "Discount cheese for everyone", hint: "That gives money away to people who'd buy it anyway. The rule is about pasta-and-tomato buyers." },
        { text: "Shelve cheese next to the pasta and tomato", correct: true },
        { text: "Stop stocking tomatoes", hint: "Tomato is part of the pattern. Removing it would lose sales." },
        { text: "Nothing, because the rule isn't reliable", hint: "It passes all three thresholds, so it's reliable enough to act on." },
      ],
      ladder: ["The rule says pasta-and-tomato buyers are very likely to want cheese.", "Put the then item where the if customers already are."],
      explain: "Placing cheese beside pasta and tomato reminds exactly the customers who are most likely to buy it.",
    },
    {
      id: "m6-lift", type: "mc", prompt: "Fries → Soda has lift 3.28. What does that mean?", layout: "list",
      options: [
        { text: "Fries buyers are 3.28 times as likely as average to buy soda", correct: true },
        { text: "328% of fries buyers buy soda", hint: "Lift isn't a percentage of customers. That would be impossible." },
        { text: "Soda is 3.28 times more popular than fries", hint: "Lift compares soda among fries buyers with soda among everyone." },
        { text: "3.28 customers bought soda", hint: "Lift is a ratio, not a count." },
      ],
      ladder: ["Lift = confidence ÷ the normal rate of the then item.", "88% of fries buyers take soda, against 27% of all customers."],
      explain: "88% ÷ 27% ≈ 3.28: fries buyers are over three times as likely to take soda.",
      highlight: { lit: ["Fries"], both: ["Soda"] },
    },
  ],
};

export const basketDetective: ActivityDef = {
  id: "basket-detective",
  shop: "Corner Mart",
  title: "Basket Detective",
  topic: "Association rules",
  summary: "Find out which products customers buy together, using support, confidence and lift.",
  theme: {
    owner: { name: "Mrs Tan", initials: "MT" },
    stop: "Aisle",
    rows: ["receipt", "receipts"],
    intro: "Association rules at Mrs Tan's minimart. Each aisle is one mission: a quick review, a hands-on task and a checkpoint.",
    finale: "That's every aisle done. You're a proper basket detective now. My Monday meeting is sorted.",
  },
  view: { Grid: Slips, has: (t, item) => t.includes(item) },
  missions: [m1, m2, m3, m4, m5, m6],
};
