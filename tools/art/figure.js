/* Pose library — joints in a 100x100 box, y down, figure facing right.
   Drawn pictogram-style (Olympic-pictogram lineage): clean, readable
   silhouettes rather than attempted realism, so they never look deformed. */
const POSES = {
  roundhouse: { // high roundhouse kick to the right
    head:[30,15], neck:[33,24], hip:[45,54],
    shoulderA:[28,26], elbowA:[22,37], wristA:[30,44],
    shoulderB:[38,25], elbowB:[45,36], wristB:[38,45],
    kneeA:[42,74], ankleA:[38,95],
    kneeB:[62,50], ankleB:[88,38]
  },
  frontkick: { // snapping front kick
    head:[36,14], neck:[38,23], hip:[44,54],
    shoulderA:[33,25], elbowA:[27,36], wristA:[35,43],
    shoulderB:[43,25], elbowB:[50,35], wristB:[43,44],
    kneeA:[43,74], ankleA:[41,95],
    kneeB:[60,54], ankleB:[84,52]
  },
  guard: { // boxing guard, weight settled
    head:[44,15], neck:[45,24], hip:[47,54],
    shoulderA:[39,26], elbowA:[35,38], wristA:[42,30],
    shoulderB:[51,26], elbowB:[56,38], wristB:[49,30],
    kneeA:[40,73], ankleA:[36,95],
    kneeB:[56,72], ankleB:[60,95]
  },
  horsestance: { // deep horse stance, fists chambered
    head:[46,17], neck:[47,26], hip:[47,55],
    shoulderA:[40,28], elbowA:[34,40], wristA:[40,48],
    shoulderB:[54,28], elbowB:[60,40], wristB:[54,48],
    kneeA:[32,72], ankleA:[28,95],
    kneeB:[62,72], ankleB:[66,95]
  },
  bow: { // deep respectful bow
    head:[36,34], neck:[41,39], hip:[52,56],
    shoulderA:[38,41], elbowA:[36,52], wristA:[38,63],
    shoulderB:[46,40], elbowB:[45,52], wristB:[46,63],
    kneeA:[50,75], ankleA:[48,95],
    kneeB:[56,75], ankleB:[57,95]
  },
  meditate: { // seated, still
    head:[48,28], neck:[49,36], hip:[50,66],
    shoulderA:[43,38], elbowA:[38,52], wristA:[44,64],
    shoulderB:[55,38], elbowB:[60,52], wristB:[55,64],
    kneeA:[33,74], ankleA:[47,79],
    kneeB:[67,74], ankleB:[53,79]
  },
  ready: { // standing ready, calm authority
    head:[46,15], neck:[47,24], hip:[48,54],
    shoulderA:[41,26], elbowA:[38,39], wristA:[42,50],
    shoulderB:[53,26], elbowB:[56,39], wristB:[52,50],
    kneeA:[43,74], ankleA:[41,95],
    kneeB:[53,74], ankleB:[55,95]
  },
  punch: { // straight punch, full extension
    head:[38,16], neck:[40,25], hip:[45,55],
    shoulderA:[34,27], elbowA:[28,38], wristA:[36,45],
    shoulderB:[45,26], elbowB:[57,29], wristB:[70,31],
    kneeA:[40,74], ankleA:[35,95],
    kneeB:[55,73], ankleB:[60,95]
  },
  blockhigh: { // rising block, forearm above the head
    head:[44,21], neck:[45,29], hip:[47,56],
    shoulderA:[39,31], elbowA:[34,42], wristA:[44,46],
    shoulderB:[51,29], elbowB:[59,21], wristB:[38,11],
    kneeA:[41,75], ankleA:[37,95],
    kneeB:[55,74], ankleB:[59,95]
  },
  child: { // smaller proportions, eager stance
    head:[45,22], neck:[46,31], hip:[48,58],
    shoulderA:[40,33], elbowA:[35,44], wristA:[42,40],
    shoulderB:[52,33], elbowB:[58,44], wristB:[51,40],
    kneeA:[42,76], ankleA:[39,95],
    kneeB:[55,76], ankleB:[58,95]
  },
  throw: { // judo grip and pull, deep base
    head:[36,24], neck:[40,31], hip:[50,57],
    shoulderA:[35,33], elbowA:[26,40], wristA:[19,48],
    shoulderB:[45,32], elbowB:[37,43], wristB:[27,51],
    kneeA:[46,76], ankleA:[42,95],
    kneeB:[60,72], ankleB:[68,94]
  },
  coach: { // standing tall, instructing
    head:[44,15], neck:[45,24], hip:[47,54],
    shoulderA:[40,26], elbowA:[37,39], wristA:[41,50],
    shoulderB:[51,26], elbowB:[62,28], wristB:[75,26],
    kneeA:[43,74], ankleA:[41,95],
    kneeB:[53,74], ankleB:[56,95]
  },
  sidekick: { // side kick, body angled
    head:[28,20], neck:[32,27], hip:[46,52],
    shoulderA:[27,29], elbowA:[20,38], wristA:[28,44],
    shoulderB:[37,28], elbowB:[42,38], wristB:[35,46],
    kneeA:[44,73], ankleA:[40,95],
    kneeB:[64,48], ankleB:[90,44]
  }
};

/* Draw one figure. Segments are stroked with round caps so they fuse into a
   single clean silhouette; a gold pass sits behind for the rim light. */
function drawFigure(ctx, pose, x, y, size, opts) {
  opts = opts || {};
  const P = POSES[pose] || POSES.ready;
  const s = size / 100;
  const px = (p) => [x + p[0] * s, y + p[1] * s];

  const limbs = [
    ["neck", "hip", 12],
    ["shoulderA", "elbowA", 7], ["elbowA", "wristA", 6],
    ["shoulderB", "elbowB", 7], ["elbowB", "wristB", 6],
    ["hip", "kneeA", 9], ["kneeA", "ankleA", 7],
    ["hip", "kneeB", 9], ["kneeB", "ankleB", 7],
    ["shoulderA", "shoulderB", 8]
  ];

  function pass(color, grow, dx, dy) {
    ctx.save();
    ctx.translate(dx || 0, dy || 0);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const [a, b, w] of limbs) {
      const A = px(P[a]), B = px(P[b]);
      ctx.lineWidth = (w + grow) * s;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    }
    const H = px(P.head);
    ctx.beginPath(); ctx.arc(H[0], H[1], (7.5 + grow / 2) * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (opts.rim !== false) {
    pass(opts.rimColor || "rgba(246,215,122,.9)", 1.6, -size * 0.011, -size * 0.009);
    pass(opts.rimColor2 || "rgba(225,29,42,.6)", 1.2, size * 0.010, size * 0.008);
  }
  pass(opts.color || "#08080a", 0, 0, 0);
}

/* Lowest point of a pose (0-100), so the renderer can stand the figure
   on the floor line instead of guessing a vertical offset. */
function poseMaxY(pose) {
  const P = POSES[pose] || POSES.ready;
  return Math.max(...Object.values(P).map(p => p[1]));
}
/* Horizontal extent, used to centre the figure regardless of limb reach. */
function poseSpanX(pose) {
  const P = POSES[pose] || POSES.ready;
  const xs = Object.values(P).map(p => p[0]);
  return [Math.min(...xs), Math.max(...xs)];
}
