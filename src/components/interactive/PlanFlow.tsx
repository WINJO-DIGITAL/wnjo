"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { depositPence } from "@/lib/deposit";
import {
  CARE_PLANS,
  PACKAGES,
  formatGBP,
  type CarePlan,
  type PackageId,
} from "@/lib/pricing";
import {
  appPlanCard,
  carePlanCards,
  packagePages,
  packagePlanCards,
} from "@/lib/plans";
import { PlanSwiper } from "./PlanSwiper";

/** The hosting choice: a plan, "none" for hosting it yourself, or nothing yet. */
type Care = CarePlan | null;

type FlowState = {
  pkg: PackageId | null;
  care: Care;
  setPkg: (id: PackageId) => void;
  setCare: (id: Care) => void;
};

const FlowContext = createContext<FlowState | null>(null);

function useFlow(): FlowState {
  const value = useContext(FlowContext);
  if (!value) throw new Error("Plan pickers must sit inside <PlanFlow>.");
  return value;
}

const isPackage = (id: string): id is PackageId => id in PACKAGES;
const isCare = (id: string): id is CarePlan => id in CARE_PLANS;

/**
 * Nothing is chosen on load. Pick a package, then hosting; the bar along the
 * bottom shows the running price and only continues once both are chosen.
 */
export function PlanFlow({ children }: { children: ReactNode }) {
  const [pkg, setPkgState] = useState<PackageId | null>(null);
  const [care, setCareState] = useState<Care>(null);

  const state: FlowState = {
    pkg,
    care,
    setPkg: (id) => setPkgState(id),
    setCare: (id) => setCareState(id),
  };

  return (
    <FlowContext.Provider value={state}>
      {children}
      <FlowBar />
    </FlowContext.Provider>
  );
}

/** The package cards, with the selection held by the flow. */
export function PackagePicker() {
  const { pkg, setPkg } = useFlow();
  return (
    <PlanSwiper
      plans={[...packagePlanCards, appPlanCard]}
      label="Starting prices"
      selectedId={pkg}
      onSelect={(id) => {
        if (isPackage(id)) setPkg(id);
      }}
    />
  );
}

/** The hosting cards, plus an option to host the site yourself. */
export function HostingPicker() {
  const { care, setCare } = useFlow();
  const selectedCard = care && care !== "none" ? care : null;
  return (
    <>
      <PlanSwiper
        plans={carePlanCards}
        label="Hosting and care plans"
        selectedId={selectedCard}
        onSelect={(id) => {
          if (isCare(id)) setCare(id);
        }}
      />
      <div className="container container--wide mt-6">
        <button
          type="button"
          className="btn btn--secondary"
          aria-pressed={care === "none"}
          onClick={() => setCare(care === "none" ? null : "none")}
        >
          {care === "none"
            ? "Hosting it myself (selected)"
            : "I'll host it myself"}
        </button>
      </div>
    </>
  );
}

function FlowBar() {
  const { pkg, care } = useFlow();
  if (!pkg) return null;

  const pkgInfo = PACKAGES[pkg];
  const total = pkgInfo.from;
  const deposit = depositPence(total * 100) / 100;
  const href = care
    ? `/build?pages=${encodeURIComponent(packagePages[pkg])}&care=${care}`
    : null;

  let hostingText: string;
  if (care === "none") hostingText = "hosting yourself";
  else if (care)
    hostingText = `${CARE_PLANS[care].label} ${formatGBP(CARE_PLANS[care].monthly)}/month`;
  else hostingText = "choose hosting to continue";

  return (
    <section className="plan-bar" aria-label="Your choice">
      <div className="plan-bar__inner">
        <p className="plan-bar__summary">
          <strong>{pkgInfo.name}</strong> from {formatGBP(total)} +{" "}
          {hostingText}
          <span className="plan-bar__deposit">
            Deposit of 50% when you approve, from {formatGBP(deposit)}.
          </span>
        </p>
        {href ? (
          <Link href={href} className="btn btn--primary">
            Continue
          </Link>
        ) : (
          <span className="btn btn--secondary" aria-disabled="true">
            Continue
          </span>
        )}
      </div>
    </section>
  );
}
