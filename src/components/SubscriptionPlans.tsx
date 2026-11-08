import Link from "next/link";
import {
  BUYOUT_FLOOR,
  DAY_RATE,
  SCOPED_FROM,
  SUBSCRIPTIONS,
  formatGBP,
  type SubscriptionId,
} from "@/lib/pricing";

const ORDER: SubscriptionId[] = ["grow", "growPlus", "simplify", "build"];

/**
 * The four monthly subscriptions with their setup fee and monthly price, then the starting prices for scoped
 * bespoke work. Every figure comes from lib/pricing, so the page and the price list can't disagree.
 */
export function SubscriptionPlans() {
  return (
    <div className="subs">
      <ul className="subs__list" role="list">
        {ORDER.map((id) => {
          const plan = SUBSCRIPTIONS[id];
          return (
            <li key={id} className="subs__plan">
              <h3 className="subs__name">{plan.name}</h3>
              <p className="subs__summary">{plan.summary}</p>
              <p className="subs__price">
                <span className="subs__amount">
                  {id === "build" ? "from " : ""}
                  {formatGBP(plan.monthly)}
                </span>
                <span className="subs__unit"> a month</span>
              </p>
              <p className="subs__setup">
                {plan.setup === null ? "Setup scoped with you" : `${formatGBP(plan.setup)} setup`}
              </p>
              <ul className="subs__includes" role="list">
                {plan.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="subs__fine">
        12-month minimum term from go-live, then 30 days&apos; notice. Buy the build outright at any time: the build
        price less the build share of what you&apos;ve paid, never below {Math.round(BUYOUT_FLOOR * 100)}% of the build
        price. <Link href="/terms">Full terms</Link>.
      </p>
      <p className="subs__fine">
        Bespoke projects: booking systems from {formatGBP(SCOPED_FROM.bookingSystem)}, apps and software from{" "}
        {formatGBP(SCOPED_FROM.software)}, and extra work at {formatGBP(DAY_RATE)} a day.
      </p>
    </div>
  );
}
