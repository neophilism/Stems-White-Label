import { db } from "../src/lib/db";
// Retain non-secret references for delayed provider reconciliation.
db.hostedCheckout.updateMany({ where: { expiresAt: { lte: new Date() }, token: { not: "" } }, data: { token: "" } })
  .then(result => console.log("Expired hosted tokens cleared:", result.count))
  .catch(() => { console.error("Hosted token cleanup failed."); process.exitCode = 1; })
  .finally(() => db.$disconnect());
