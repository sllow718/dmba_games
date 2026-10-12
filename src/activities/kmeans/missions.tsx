import type { AnyActivity, MissionDef } from "../../core/types";
import type { Member, Shopper } from "./data";
import { MEMBERS, SHOPPERS } from "./data";
import { ExploreSteps } from "./explores";
import { ExploreNormalise, ShopperPlot, hasShopperTag } from "./norm";
import { MemberPlot, hasTag } from "./ui";

type Mission = MissionDef<Member>;

const LABEL = "Gym & Juice · 12 members · visits per month vs spend per visit";

const m1: Mission = {
  n: 1,
  title: "Step Through K-Means",
  concept: "The k-means algorithm",
  badge: "Cluster Builder",
  data: MEMBERS,
  dataLabel: LABEL,
  brief: "Welcome to Gym & Juice. I want to group my members into types so I can plan offers for each. K-means can find the groups. Let's see how it works.",
  card: { formula: "repeat: assign each point to its nearest centroid → move each centroid to the average of its points", example: "Members 1, 4, 7 and 10 → centroid around 5 visits and $24 a visit" },
  review: {
    title: "Clusters and centroids",
    what: (
      <>
        <p><b>Clustering</b> puts similar records into groups. Nobody tells the algorithm the right answer: there is no outcome column. That makes it <b>unsupervised</b> learning.</p>
        <p><b>K-means</b> finds <b>k</b> clusters, where you choose k. Each cluster has a <b>centroid</b>: its average point, like a typical member of the group.</p>
      </>
    ),
    howHeading: ["How it works", "The k-means loop"],
    how: (
      <>
        <ol className="ksteps static">
          <li><b>Choose k</b><span>How many clusters you want.</span></li>
          <li><b>Place k starting centroids</b><span>Usually k random points from the data.</span></li>
          <li><b>Assign</b><span>Each point joins its nearest centroid.</span></li>
          <li><b>Move</b><span>Each centroid moves to the average of its points.</span></li>
          <li><b>Repeat</b><span>Assign and move again until no point changes cluster.</span></li>
        </ol>
        <p style={{ color: "var(--sub)", fontSize: "0.88rem", marginTop: 10 }}>"Nearest" means straight-line distance on the chart. A centroid's position is the average x and average y of its points.</p>
      </>
    ),
    exampleTitle: "Three clusters of Gym & Juice members",
    steps: [
      { text: "Each dot is a member: visits per month across, spend per visit up.", eq: "12 members, k = 3", say: "Can you already see three groups?" },
      { text: "Cluster 1: members 1, 4, 7 and 10.", eq: "centroid = (5 visits, $24)", say: "They don't come often, but they spend a lot when they do.", highlight: { lit: ["c=0"] } },
      { text: "Cluster 2: members 2, 5, 8 and 11.", eq: "centroid = (23 visits, $5)", say: "My regulars who just grab a water.", highlight: { lit: ["c=1"] } },
      { text: "Cluster 3: members 3, 6, 9 and 12.", eq: "centroid = (23 visits, $25)", say: "Regulars who also buy smoothies. My best customers.", highlight: { lit: ["c=2"] } },
      { text: "Each centroid sits in the middle of its cluster.", eq: "3 clusters · 3 centroids", say: "Three member types, each described by its centroid.", highlight: { lit: ["all", "centroids"] } },
    ],
    remember: [
      "You choose k. K-means always returns exactly k clusters.",
      "A centroid is the average of the points in its cluster.",
      "Each round: assign every point to its nearest centroid, then move every centroid to the average of its points.",
      "It stops when an assignment changes nobody's cluster.",
    ],
    says: ["First, what clustering is for.", "Five steps, and steps 3 and 4 repeat.", "Here's where k-means ends up on my members.", "Now step through it yourself."],
  },
  explore: { goal: "Pick n and k, then step through k-means until it converges.", Component: ExploreSteps },
  questions: [
    {
      id: "k1-k", type: "mc", prompt: "What does k stand for in k-means?", layout: "list",
      options: [
        { text: "The number of points", hint: "That's n. k is something you choose about the result." },
        { text: "The number of clusters you ask for", correct: true },
        { text: "The number of rounds it runs", hint: "The number of rounds depends on when it converges." },
        { text: "The number of variables", hint: "Here there are two variables, but k can be anything you choose." },
      ],
      ladder: ["You choose k before the algorithm starts.", "K-means always returns exactly k groups."],
      explain: "k is the number of clusters. You choose it, and k-means always returns exactly that many.",
    },
    {
      id: "k1-assign", type: "mc", prompt: "In the assign step, which cluster does a point join?", layout: "list",
      options: [
        { text: "The cluster with the fewest points", hint: "Cluster size doesn't matter in the assign step." },
        { text: "A random cluster", hint: "Only the starting centroids are random. Assigning is by distance." },
        { text: "The cluster whose centroid is nearest", correct: true },
        { text: "The cluster it joined first", hint: "Points can switch clusters in later rounds." },
      ],
      ladder: ["The assign step is about distance.", "Each point looks for the closest centroid."],
      explain: "Each point joins the cluster with the nearest centroid.",
    },
    {
      id: "k1-move", type: "mc", prompt: "Where does a centroid move in the move step?", layout: "list",
      options: [
        { text: "To the average of the points in its cluster", correct: true },
        { text: "To the point furthest away", hint: "That would pull it out of the group, not into the middle." },
        { text: "To a new random point", hint: "Random positions are only used at the very start." },
        { text: "It stays where it started", hint: "Centroids move every round until the clusters settle." },
      ],
      ladder: ["The centroid is the middle of its group.", "Middle here means the average x and average y."],
      explain: "Each centroid moves to the average of its points, the middle of its cluster.",
    },
    {
      id: "k1-tap", type: "tap", prompt: "Tap every member in the cluster of regulars who spend little.", items: ["c=1"], need: "lots of visits and low spend",
      ladder: ["Look bottom right: many visits, low spend.", "Members 2, 5, 8 and 11 sit at the bottom right."],
      explain: "Members 2, 5, 8 and 11 visit often but spend about $5 a visit.",
      highlight: { lit: ["c=1"] },
    },
    {
      id: "k1-stop", type: "mc", prompt: "When does k-means stop?", layout: "list",
      options: [
        { text: "After exactly k rounds", hint: "k is the number of clusters, not rounds." },
        { text: "When every cluster has the same number of points", hint: "Clusters can end up different sizes." },
        { text: "When the total distance reaches 0", hint: "That would only happen if every point sat on its centroid." },
        { text: "When an assignment changes nobody's cluster", correct: true },
      ],
      ladder: ["If nobody switches cluster, what happens to the averages?", "Same members → same averages → the centroids don't move."],
      explain: "If no point changes cluster, the averages stay the same, so the centroids stop moving. It has converged.",
    },
  ],
};

const SCALE_LABEL = "Gym & Juice · 12 members · visits per month and yearly spend";

const m2: MissionDef<Shopper> = {
  n: 2,
  title: "Scale Matters",
  concept: "Normalising before k-means",
  badge: "Fair Scaler",
  data: SHOPPERS,
  dataLabel: SCALE_LABEL,
  view: { Grid: ShopperPlot, has: hasShopperTag },
  brief: "I added yearly spend in dollars next to visits per month, ran k-means, and got strange groups. Casual and regular members ended up mixed together. Let's find out why.",
  card: { formula: "normalise each variable to the same scale (e.g. 0–1) before k-means", example: "Without it, $ differences in the hundreds swamp visit differences of 20" },
  review: {
    title: "Why scale matters",
    what: (
      <>
        <p>K-means groups members by <b>distance</b>. Distance adds up the differences on every variable.</p>
        <p>If one variable is measured in much bigger numbers, its differences swamp the others. A $100 gap in yearly spend outweighs a gap of 20 visits a month, even though 20 visits is a huge difference in behaviour.</p>
        <p style={{ color: "var(--sub)" }}>The result: k-means effectively ignores the small-number variable.</p>
      </>
    ),
    howHeading: ["How to fix it", "Normalise first"],
    how: (
      <>
        <p><b>Normalising</b> rescales every variable onto the same scale before k-means runs. A common way is <b>min–max</b>: the smallest value becomes 0, the largest becomes 1, and everything else falls in between.</p>
        <table className="mini">
          <thead><tr><th scope="col" /><th scope="col">Visits / month</th><th scope="col">Yearly spend</th></tr></thead>
          <tbody>
            <tr><th scope="row">Raw range</th><td>2 to 27</td><td>$380 to $1,500</td></tr>
            <tr><th scope="row">After normalising</th><td>0 to 1</td><td>0 to 1</td></tr>
          </tbody>
        </table>
        <p>Now a big difference in visits counts as much as a big difference in spend. Another common option is the <b>z-score</b>, which rescales each variable by its average and spread.</p>
      </>
    ),
    exampleTitle: "Clustering the 12 members, before and after",
    steps: [
      { text: "Casual members (purple) visit 2–6 times a month. Regulars (teal) visit 21–27. Both spend anywhere from $380 to $1,500 a year.", eq: "the real groups differ by visits", say: "The two types are easy to see on the chart.", highlight: { lit: ["type"] } },
      { text: "Run k-means with k = 2 on the raw numbers.", eq: "split: lower spenders vs higher spenders", say: "Casual and regular members are mixed in both clusters.", highlight: { lit: ["raw"] } },
      { text: "Why? Draw it the way raw distances measure it: 1 visit counts the same as $1.", eq: "visit gap ≈ 25 · spend gap ≈ 1,100", say: "Visits squash into a thin strip. K-means can hardly see them.", highlight: { lit: ["seen", "raw"] } },
      { text: "Normalise both variables to 0–1, then run k-means again.", eq: "split: casual vs regular", say: "Now visits count as much as spend, and the real groups appear.", highlight: { lit: ["scaled", "norm"] } },
      { text: "Back on the normal chart, the new clusters match the member types.", eq: "cluster 1 ≈ 4 visits · cluster 2 ≈ 24 visits", say: "Same data, same k. The only change was the scale.", highlight: { lit: ["norm"] } },
    ],
    remember: [
      "K-means uses distance, so variables with bigger numbers count for more.",
      "Normalise when variables are in different units or have very different ranges.",
      "Min–max normalising puts every variable on a 0–1 scale.",
      "Normalising changes how distance is measured, not the members. Describe the clusters in the original units.",
    ],
    says: ["Something went wrong with my clusters.", "One fix: put everything on the same scale.", "Watch the same 12 members, before and after.", "Now try it on more members."],
  },
  explore: { goal: "Run k-means with and without normalising, and see what changes.", Component: ExploreNormalise },
  questions: [
    {
      id: "k2-why", type: "mc", prompt: "Without normalising, k-means split the members by spend and ignored visits. Why?", layout: "list",
      options: [
        { text: "Visits don't matter for gym members", hint: "Casual and regular members are very different. Visits matter a lot." },
        { text: "Spend is measured in much bigger numbers, so it dominates the distance", correct: true },
        { text: "K-means always uses the second variable", hint: "K-means treats every variable the same way. The size of the numbers is the issue." },
        { text: "k = 2 was the wrong choice", hint: "Two groups is right here. The problem is the scale." },
      ],
      ladder: ["K-means groups by distance.", "Compare a gap of 20 visits with a gap of $500."],
      explain: "Dollar differences run into the hundreds while visit differences are under 30, so spend swamps visits in the distance.",
      highlight: { lit: ["raw"] },
    },
    {
      id: "k2-gap", type: "mc", prompt: "Member A visits 20 more times a month than member B. Member B spends $300 more a year. Without normalising, which gap counts for more in k-means?", layout: "list",
      options: [
        { text: "The 20 visits", hint: "In raw distance, 20 visits counts the same as $20." },
        { text: "Both count the same", hint: "Distance compares the raw numbers: 20 against 300." },
        { text: "The $300", correct: true },
      ],
      ladder: ["Raw distance just compares the numbers.", "Which is bigger: 20 or 300?"],
      explain: "300 is far bigger than 20, so the spend gap dominates, even though 20 extra visits is the bigger change in behaviour.",
    },
    {
      id: "k2-what", type: "mc", prompt: "What does min–max normalisation do?", layout: "list",
      options: [
        { text: "Removes the members with extreme values", hint: "Every member stays. Only the scale changes." },
        { text: "Rounds every value to a whole number", hint: "It actually produces values between 0 and 1." },
        { text: "Rescales each variable to run from 0 to 1", correct: true },
        { text: "Adds the variables together", hint: "Each variable is rescaled on its own." },
      ],
      ladder: ["Think about the smallest and largest value of each variable.", "The smallest becomes 0 and the largest becomes 1."],
      explain: "Each variable is rescaled so its smallest value is 0 and its largest is 1, so every variable counts on the same scale.",
    },
    {
      id: "k2-after", type: "mc", prompt: "After normalising, what did k-means find in the 12 members?", layout: "list",
      options: [
        { text: "Casual visitors and regular visitors", correct: true },
        { text: "Lower spenders and higher spenders", hint: "That was before normalising." },
        { text: "One cluster for every member", hint: "k was still 2." },
        { text: "The same clusters as before", hint: "Compare the colours before and after: they changed." },
      ],
      ladder: ["Look at the average visits of each new cluster.", "About 4 visits against about 24 visits."],
      explain: "With both variables on the same scale, the big difference in visits shows up, and the clusters match casual and regular members.",
      highlight: { lit: ["norm"] },
    },
    {
      id: "k2-when", type: "mc", prompt: "When should you normalise before running k-means?", layout: "list",
      options: [
        { text: "Only when there are more than 100 members", hint: "The number of members doesn't matter. The scales do." },
        { text: "When the variables are in different units or have very different ranges", correct: true },
        { text: "Never: it changes the members' data", hint: "It changes how distance is measured. You can still describe clusters in real units." },
        { text: "Only when k is bigger than 3", hint: "k doesn't decide this. The variables' scales do." },
      ],
      ladder: ["The problem came from mixing visits and dollars.", "Different units, very different ranges."],
      explain: "Normalise whenever variables use different units or ranges, so no single variable dominates the distance.",
    },
    {
      id: "k2-describe", type: "mc", prompt: "After normalising, how should you describe each cluster to Coach Ana?", layout: "list",
      options: [
        { text: "In normalised values, like 0.1 visits and 0.6 spend", hint: "Those numbers mean nothing to a gym owner." },
        { text: "In the original units, like 4 visits a month and $950 a year", correct: true },
        { text: "Only by cluster number", hint: "A number alone doesn't say what the members are like." },
      ],
      ladder: ["Who is the description for?", "Coach Ana thinks in visits and dollars."],
      explain: "Normalising is only for measuring distance. Describe the clusters in real units so they make sense.",
    },
  ],
};

export const customerTribes: AnyActivity = {
  id: "customer-tribes",
  shop: "Gym & Juice",
  title: "Customer Tribes",
  topic: "K-means clustering",
  summary: "Group gym members into segments by stepping through k-means, and see why normalising the data matters.",
  theme: {
    owner: { name: "Coach Ana", initials: "CA" },
    stop: "Mission",
    rows: ["member", "members"],
    intro: "K-means clustering at Coach Ana's gym café. Each mission is a quick review, a guided hands-on run and a checkpoint.",
    finale: "That's both missions done. You can run k-means step by step and know to normalise first. My member offers are sorted.",
  },
  view: { Grid: MemberPlot, has: hasTag },
  missions: [m1, m2],
};
