import type { ActivityDef, MissionDef } from "../../core/types";
import type { Member } from "./data";
import { MEMBERS } from "./data";
import { ExploreElbow, ExploreSteps } from "./explores";
import { ElbowFigure, MemberPlot, hasTag } from "./ui";

type Mission = MissionDef<Member>;

const LABEL = "Gym & Juice · 12 members · visits per month vs spend per visit";
/** Lowest total within-cluster distance for the 12 members at each k (checked in content.test.ts). */
export const MEMBER_WCSS = { 1: 1998, 2: 768, 3: 118, 4: 93, 5: 75 };

const m1: Mission = {
  n: 1,
  title: "Step Through K-Means",
  concept: "The k-means algorithm",
  badge: "Cluster Builder",
  data: MEMBERS,
  dataLabel: LABEL,
  brief: "Welcome to Gym & Juice. I want to group my members into types so I can plan offers for each. K-means can find the groups. Let's see how it works.",
  card: { formula: "repeat: assign each point to its nearest centroid → move each centroid to the average of its points", example: "Members 1, 4, 7, 10 → centroid (5 visits, $24)" },
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
      id: "k1-mean", type: "num", kind: "decimal", prompt: "Members 1, 4, 7 and 10 visit 4, 6, 3 and 7 times a month. What is the visits value of their centroid?", answer: 5,
      traps: [{ value: 20, hint: "That's the total. The centroid is the average: divide by 4." }],
      first: "Add the four visit counts and divide by how many members there are.",
      ladder: ["4 + 6 + 3 + 7 = 20.", "20 ÷ 4 = …?"],
      explain: "20 ÷ 4 = 5 visits a month. Do the same for spend and the centroid is (5, $24).",
      highlight: { lit: ["c=0"] },
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

const m2: Mission = {
  n: 2,
  title: "Choosing k",
  concept: "Choosing k & reading clusters",
  badge: "Segment Spotter",
  data: MEMBERS,
  dataLabel: LABEL,
  brief: "K-means always gives me exactly k groups, even if k is a bad choice. How do I pick k, and can I trust the answer?",
  card: { formula: "WCSS = Σ (distance from each point to its centroid)² · pick k at the elbow", example: "12 members: 1998, 768, 118, 93 for k = 1–4 → elbow at k = 3" },
  review: {
    title: "Total distance and the elbow",
    what: (
      <>
        <p>K-means can't choose k for you, and its answer depends on where the centroids start.</p>
        <p>To judge a result, measure how <b>tight</b> the clusters are: the total within-cluster distance, often called <b>WCSS</b>. Smaller means members sit closer to their centroid.</p>
      </>
    ),
    howHeading: ["How to judge it", "Reading WCSS"],
    how: (
      <>
        <div className="formula">WCSS = add up (distance from each point to its own centroid)²</div>
        <p><b>More clusters always lower WCSS</b>, so the smallest value isn't the answer. With one cluster per point it would be 0.</p>
        <p>Plot WCSS for each k and look for the <b>elbow</b>: the k where the big drops stop. Also run k-means a few times with new starting centroids and keep the run with the lowest WCSS.</p>
      </>
    ),
    exampleTitle: "Choosing k for the 12 members",
    steps: [
      { text: "One cluster: everyone around one centroid.", eq: "k = 1 · WCSS 1998", say: "One big blob. Not useful." },
      { text: "Two clusters.", eq: "k = 2 · WCSS 768", say: "Better, but two different types are still lumped together." },
      { text: "Three clusters.", eq: "k = 3 · WCSS 118", say: "A huge drop. Each type gets its own cluster.", highlight: { lit: ["all", "centroids"] } },
      { text: "Four clusters.", eq: "k = 4 · WCSS 93", say: "Only a small drop. It's just splitting a group that belongs together." },
      { text: "The drops stop being big after k = 3.", eq: "elbow at k = 3", say: "Three member types it is.", highlight: { lit: ["all", "centroids"] } },
    ],
    remember: [
      "WCSS always goes down (or stays the same) as k goes up.",
      "Choose k at the elbow, where adding clusters stops helping much.",
      "Different starting centroids can give different clusters. Run it a few times and keep the lowest WCSS.",
      "Describe each cluster by its centroid: (5 visits, $24) means occasional visitors who spend a lot.",
    ],
    says: ["Two problems: choosing k, and trusting the answer.", "One number to judge a clustering.", "Let's try k = 1 to 4 on my members.", "Now find the elbow yourself."],
  },
  explore: { goal: "Run k-means with different k and different starts, then find the elbow.", Component: ExploreElbow },
  questions: [
    {
      id: "k2-trend", type: "mc", prompt: "What happens to total within-cluster distance (WCSS) as k goes up?", layout: "list",
      options: [
        { text: "It goes up", hint: "More centroids means each point has one closer by." },
        { text: "It goes down or stays the same", correct: true },
        { text: "It stays exactly the same", hint: "Compare 1998 for k = 1 with 768 for k = 2." },
        { text: "It goes up and down at random", hint: "With the best runs, it only ever goes down." },
      ],
      ladder: ["More centroids means points have more chances to be close to one.", "Look at 1998, 768, 118, 93."],
      explain: "More clusters can only bring points closer to a centroid, so WCSS goes down. That's why you can't just pick the smallest.",
    },
    {
      id: "k2-elbow", type: "mc", prompt: "Here is WCSS for the 12 members. Where is the elbow?", figure: <ElbowFigure values={MEMBER_WCSS} />,
      options: [
        { text: "k = 2", hint: "There's still a huge drop from 768 to 118 after this." },
        { text: "k = 5", hint: "The smallest WCSS isn't the elbow. More k always lowers it." },
        { text: "k = 3", correct: true },
        { text: "k = 1", hint: "One cluster has the highest WCSS of all." },
      ],
      ladder: ["Find where the big drops stop.", "768 → 118 is big; 118 → 93 is small."],
      explain: "WCSS falls sharply up to k = 3, then barely changes. The elbow is k = 3.",
    },
    {
      id: "k2-twelve", type: "mc", prompt: "Why not choose k = 12, one cluster for each member?", layout: "list",
      options: [
        { text: "WCSS would be 0, but every cluster is one member, so you learn nothing", correct: true },
        { text: "K-means can't run with k = 12", hint: "It can. Each member would be its own centroid." },
        { text: "WCSS would be very high", hint: "Every point would sit exactly on its own centroid." },
        { text: "It would take too long to compute", hint: "Speed isn't the problem. Think about what the clusters would tell you." },
      ],
      ladder: ["Where would each centroid be?", "Each centroid is one member, so the distance is 0. Is that useful?"],
      explain: "With one cluster per member, WCSS is 0 but there are no groups at all. The aim is a few meaningful segments.",
    },
    {
      id: "k2-start", type: "mc", prompt: "Two runs with k = 3 on the same data give different clusters. Why?", layout: "list",
      options: [
        { text: "The data changed between runs", hint: "Same data both times." },
        { text: "They started from different random centroids", correct: true },
        { text: "K-means makes mistakes in the assign step", hint: "Assigning is exact: nearest centroid every time." },
        { text: "k = 3 is always wrong", hint: "k = 3 is the elbow here. The difference comes from somewhere else." },
      ],
      ladder: ["Which step uses randomness?", "Only the starting centroids are random."],
      explain: "Different starting centroids can settle into different clusterings. Run it several times and keep the lowest WCSS.",
    },
    {
      id: "k2-read", type: "mc", prompt: "One centroid sits at 23 visits a month and $25 a visit. How would you describe that segment?", layout: "list",
      options: [
        { text: "Occasional visitors who spend a lot", hint: "23 visits a month is a lot of visits." },
        { text: "Regulars who spend little", hint: "$25 a visit is high spend here." },
        { text: "Regulars who spend a lot", correct: true },
        { text: "Occasional visitors who spend little", hint: "Check both numbers: visits and spend are both high." },
      ],
      ladder: ["Read the centroid like a typical member.", "High visits and high spend."],
      explain: "Many visits and high spend: regulars who spend a lot. Coach Ana's best customers.",
      highlight: { lit: ["c=2"] },
    },
  ],
};

export const customerTribes: ActivityDef<Member> = {
  id: "customer-tribes",
  shop: "Gym & Juice",
  title: "Customer Tribes",
  topic: "K-means clustering",
  summary: "Group gym members into segments by stepping through k-means, then choose k with the elbow.",
  theme: {
    owner: { name: "Coach Ana", initials: "CA" },
    stop: "Mission",
    rows: ["member", "members"],
    intro: "K-means clustering at Coach Ana's gym café. Each mission is a quick review, a guided hands-on run and a checkpoint.",
    finale: "That's both missions done. You can run k-means step by step and pick a sensible k. My member offers are sorted.",
  },
  view: { Grid: MemberPlot, has: hasTag },
  missions: [m1, m2],
};
